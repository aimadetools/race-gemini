export default (req, res) => {
    if (req.method === 'GET' || req.method === 'HEAD') {
        res.status(200).json({ publicKey: process.env.STRIPE_PUBLIC_KEY });
    } else {
        res.status(405).send('Method Not Allowed');
    }
};
