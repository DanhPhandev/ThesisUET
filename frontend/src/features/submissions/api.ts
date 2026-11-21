import {api} from "@/lib/api";
import type {Submission,Page} from "@/types";
export const submissionsApi={
 list:(query="")=>api.get<Page<Submission>>("/submissions"+query),
 
};
