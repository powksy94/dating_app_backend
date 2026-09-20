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

    // Test accounts (internal/closed testing) only ever see other test accounts,
    // and real users never see a test account.
    const pipeline: mongoose.PipelineStage[] = [
        { $match: {
            owner: { $nin: [userId, ...excluded] },
            isTestAccount: Boolean(me?.isTestAccount),
        } },
    ];

    // Gender sought: only filters if the user has expressed a preference.
    if (me?.genderPreferences?.length) {
        pipeline.push({ $match: { gender: { $in: me.genderPreferences } } });
    }

    // Distance: profiles without a location are never excluded (missing data,
    // not out of range); $geoWithin (unlike $near) works inside an $or, which
    // allows this leniency.
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

    // Age: computed from birthDate (like the app does), not from the legacy
    // `age` field. A profile without a birthDate is treated as "unknown age"
    // and is therefore not excluded by this filter.
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
