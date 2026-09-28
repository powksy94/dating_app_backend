import { RekognitionClient, DetectModerationLabelsCommand } from '@aws-sdk/client-rekognition';
import { logger } from './logger.js';

const region          = process.env.AWS_REGION;
const accessKeyId     = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

if (!region || !accessKeyId || !secretAccessKey) {
    logger.warn('AWS_REGION/AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY manquant(s) — la modération automatique des photos est désactivée, tout upload part en file de revue.');
}

export const rekognitionConfigured = Boolean(region && accessKeyId && secretAccessKey);

const client = rekognitionConfigured
    ? new RekognitionClient({ region, credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! } })
    : null;

export type PhotoVerdict = 'approve' | 'queue' | 'reject';

// Only the categories relevant to a dating-profile photo: nudity and
// disturbing/violent content. Swimwear, alcohol, gambling etc. are normal
// dating-app content and never flagged.
const REJECT_L1 = new Set(['Explicit', 'Violence', 'Visually Disturbing']);
const QUEUE_L1  = new Set(['Non-Explicit Nudity of Intimate parts and Kissing']);

const REJECT_CONFIDENCE = 90;
const QUEUE_CONFIDENCE  = 60;

/** Classifies a photo with AWS Rekognition's content moderation labels.
 * Fails safe: any error, or Rekognition not configured, sends the photo to
 * the human queue rather than silently skipping moderation. */
export async function classifyPhoto(buffer: Buffer): Promise<{ verdict: PhotoVerdict; labels: { name: string; confidence: number }[] }> {
    if (!client) return { verdict: 'queue', labels: [] };

    try {
        const res = await client.send(new DetectModerationLabelsCommand({
            Image: { Bytes: buffer },
            MinConfidence: QUEUE_CONFIDENCE,
        }));
        const labels = (res.ModerationLabels ?? [])
            .filter((l) => l.Name && l.Confidence !== undefined)
            .map((l) => ({ name: l.Name!, confidence: l.Confidence! }));

        // Rekognition returns both the L1 parent and its L2/L3 children; a
        // label whose ParentName is empty/absent is itself the L1 category.
        const l1 = (res.ModerationLabels ?? []).filter((l) => !l.ParentName);

        if (l1.some((l) => REJECT_L1.has(l.Name ?? '') && (l.Confidence ?? 0) >= REJECT_CONFIDENCE)) {
            return { verdict: 'reject', labels };
        }
        if (l1.some((l) => (REJECT_L1.has(l.Name ?? '') || QUEUE_L1.has(l.Name ?? '')) && (l.Confidence ?? 0) >= QUEUE_CONFIDENCE)) {
            return { verdict: 'queue', labels };
        }
        return { verdict: 'approve', labels };
    } catch (err) {
        logger.error('Rekognition: échec de la classification, la photo part en file de revue', { err });
        return { verdict: 'queue', labels: [] };
    }
}
