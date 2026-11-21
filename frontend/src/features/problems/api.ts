import {api} from "@/lib/api";
import type {Problem,Page} from "@/types";
export const problemsApi={
 list:(query="")=>api.get<Page<Problem>>("/problems"+query),
 detail:(slug:string)=>api.get<Problem>(`/problems/${slug}`),
};
