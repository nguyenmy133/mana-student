
export class UserModel {
    id: string;
    username: string;
    email: string;
    password: string;
    rePassword: string;

    constructor(id: string, username: string, email: string, password: string, rePassword: string) {    
        this.id = id;
        this.username = username;
        this.email = email;
        this.password = password;
        this.rePassword = rePassword;
    }
}