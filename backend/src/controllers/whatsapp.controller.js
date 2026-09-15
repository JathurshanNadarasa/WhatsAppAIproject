const verifyWebhook = (req, res) => {
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']

    console.log('Mode:', mode)
    console.log('Token received:', token)
    console.log('Token from ENV:', process.env.WHATSAPP_VERIFY_TOKEN)
    console.log('Challenge:', challenge)

    if (
        mode === 'subscribe' &&
        token === process.env.WHATSAPP_VERIFY_TOKEN
    ) {
        console.log('WhatsApp Webhook verified')

        return res.status(200).send(challenge)
    }

    console.log('WhatsApp Webhook verification failed')

    return res.sendStatus(403)
}
const receiveWebhook = async (req, res) => {
    try {
        console.log('WhatsApp webhook received')
        console.log(JSON.stringify(req.body, null, 2))

        return res.sendStatus(200)

    } catch (error) {
        console.error(
            'WhatsApp webhook error:',
            error.message
        )

        return res.sendStatus(500)
    }
}

module.exports = {
    verifyWebhook,
    receiveWebhook
}