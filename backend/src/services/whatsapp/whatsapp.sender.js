const axios = require('axios')

const sendWhatsAppMessage = async({
    phoneNumberId,
    accessToken,
    to,
    message
}) =>{
    const url = `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`;
    const response = await axios.post(
        url,{
            messaging_product:'whatsapp',
            recipient_type :'individual',
            to,
            type:'text',
            text:{
                preview_url:false,
                body:message
            }
        },

        {
            headers:{
                Authorization:`Bearer ${accessToken}`,
                'Content-Type' : 'application/json'
            }
        }
    )
    return response.data
}

module.exports={
    sendWhatsAppMessage
}

