import {api} from "@/lib/api";
import type {User,Page} from "@/types";
export const usersApi={
 list:(query="")=>api.get<User[]>("/users"+query),
 
};
