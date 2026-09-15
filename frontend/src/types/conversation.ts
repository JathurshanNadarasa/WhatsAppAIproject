export interface Conversation{
    id:number,
    business_id:number,
    customer_id:number,
    customer_name:string|null,
    customer_phone:string,
    status:string,
    started_at:string,
    last_message_at:string
}

export interface Message{
    id:number,
    sender_type:string,
    message_type:string,
    message_text:string|null,
    created_at:string
}

export interface ConversationsResponse {
    success: boolean;
    count: number;
    conversations: Conversation[];
}
export interface ConversationResponse{
    success:boolean,
    conversation:Conversation
}

export interface MessagesResponse{
    success:boolean,
    count:number,
    messages:Message[]
}