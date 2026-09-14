export interface HealthResponse{
    success:boolean,
    message:string,
}

export interface VersionResponse {
    success: boolean;
    application: string;
    version: string;
}

export interface DatabaseHealthResponse{
    success:boolean,
    database:string,
    time:string
}

