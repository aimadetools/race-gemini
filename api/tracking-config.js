export default async (req, res) => {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    return res.status(200).json({
        gaId: process.env.OWN_GA_TRACKING_ID || null,
        pixelId: process.env.OWN_FB_PIXEL_ID || null,
        adsLabel: process.env.OWN_GOOGLE_ADS_CONVERSION_LABEL || null
    });
};
