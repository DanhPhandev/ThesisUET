import {api} from "@/lib/api";
import type {Contest,Page} from "@/types";
export const contestsApi={
 list:(query="")=>api.get<Contest[]>("/contests"+query),
 
};
