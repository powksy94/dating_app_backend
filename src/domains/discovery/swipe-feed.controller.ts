import { Response } from "express";
import mongoose from "mongoose";
import { Like } from "./like.model.js";
import { Pass } from "./pass.model.js";
import { Profile } from "../profile/profile.model.js";
import { AuthRequest } from "../../shared/middleware/auth.middleware.js";
import { getBlockedIds } from "../social/user.controller.js";

export async function fecthSwipeProfiles(req: AuthRequest, res: Response): Promise<void> {
    const userId     = new mongoose.Types.ObjectId(req.userId);
    const liked      = await Like.find({ from: userId }).distinct('to');
    const passed     = await Pass.find({ from: userId }).distinct('to');
    const blockedIds = await getBlockedIds(userId.toString());
    const excluded   = [...liked, ...passed, ...blockedIds.map(id => new mongoose.Types.ObjectId(id))];

    const me = await Profile.findOne({ owner: userId });

    const pipeline: mongoose.PipelineStage[] = [
        { $match: { owner: { $nin: [userId, ...excluded] } } },
    ];

    // Genre recherché : ne filtre que si l'utilisateur a exprimé une préférence.
    if (me?.genderPreferences?.length) {
        pipeline.push({ $match: { gender: { $in: me.genderPreferences } } });
    }

    // Distance : les profils sans localisation ne sont jamais exclus (donnée
    // absente, pas hors zone) ; $geoWithin (contrairement à $near) fonctionne
    // dans un $or, ce qui permet cette tolérance.
    if (me?.location?.coordinates && me.maxDistance) {
        const [lng, lat] = me.location.coordinates;
        pipeline.push({
            $match: {
                $or: [
                    { location: { $exists: false } },
                    { location: { $geoWithin: { $centerSphere: [[lng, lat], me.maxDistance / 6371] } } },
                ],
            },
        });
    }

    // Âge : calculé depuis birthDate (comme côté app), pas depuis le champ
    // `age` historique. Un profil sans birthDate est traité comme "âge
    // inconnu" et n'est donc pas exclu par ce filtre.
    const ageMin = me?.ageMin ?? 18;
    const ageMax = me?.ageMax ?? 99;
    pipeline.push(
        { $addFields: {
            _computedAge: {
                $cond: [
                    { $ifNull: ['$birthDate', false] },
                    { $floor: { $divide: [{ $subtract: ['$$NOW', '$birthDate'] }, 31557600000] } },
                    null,
                ],
            },
        } },
        { $match: { $or: [{ _computedAge: null }, { _computedAge: { $gte: ageMin, $lte: ageMax } }] } },
        { $project: { _computedAge: 0 } },
        { $limit: 20 },
    );

    const profiles = await Profile.aggregate(pipeline);
    res.json(profiles);
}
