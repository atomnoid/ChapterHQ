export interface UserIdentity {
	id: string;
	name: string | null;
	email: string | null;
	image: string | null;
}

export interface CurrentUser extends UserIdentity {
	authProvider?: string;
}
