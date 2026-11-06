export namespace models {
	
	export class AIConfig {
	    base_url: string;
	    model: string;
	    api_key?: string;
	
	    static createFrom(source: any = {}) {
	        return new AIConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.base_url = source["base_url"];
	        this.model = source["model"];
	        this.api_key = source["api_key"];
	    }
	}
	export class AISummaryResult {
	    summary: string;
	    key_takeaways: string[];
	    suggested_tags: string[];
	    category: string;
	
	    static createFrom(source: any = {}) {
	        return new AISummaryResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.summary = source["summary"];
	        this.key_takeaways = source["key_takeaways"];
	        this.suggested_tags = source["suggested_tags"];
	        this.category = source["category"];
	    }
	}
	export class AnalysisTaskItem {
	    bookmark_id: string;
	    title: string;
	    url: string;
	    status: string;
	    category?: string;
	    summary?: string;
	    tags?: string[];
	    error?: string;
	    // Go type: time
	    updated_at: any;
	
	    static createFrom(source: any = {}) {
	        return new AnalysisTaskItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.bookmark_id = source["bookmark_id"];
	        this.title = source["title"];
	        this.url = source["url"];
	        this.status = source["status"];
	        this.category = source["category"];
	        this.summary = source["summary"];
	        this.tags = source["tags"];
	        this.error = source["error"];
	        this.updated_at = this.convertValues(source["updated_at"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class AnalysisProgress {
	    total: number;
	    processed: number;
	    success: number;
	    failed: number;
	    is_running: boolean;
	    tasks?: AnalysisTaskItem[];
	
	    static createFrom(source: any = {}) {
	        return new AnalysisProgress(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.total = source["total"];
	        this.processed = source["processed"];
	        this.success = source["success"];
	        this.failed = source["failed"];
	        this.is_running = source["is_running"];
	        this.tasks = this.convertValues(source["tasks"], AnalysisTaskItem);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class Bookmark {
	    id: string;
	    url: string;
	    title: string;
	    description: string;
	    category: string;
	    sub_category: string;
	    domain: string;
	    favicon_url: string;
	    cover_image: string;
	    content_raw: string;
	    user_notes: string;
	    highlights: string;
	    ai_summary: string;
	    ai_key_points: string[];
	    tags: string[];
	    status_code: number;
	    is_archived: boolean;
	    is_favorite: boolean;
	    // Go type: time
	    created_at: any;
	    // Go type: time
	    updated_at: any;
	
	    static createFrom(source: any = {}) {
	        return new Bookmark(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.url = source["url"];
	        this.title = source["title"];
	        this.description = source["description"];
	        this.category = source["category"];
	        this.sub_category = source["sub_category"];
	        this.domain = source["domain"];
	        this.favicon_url = source["favicon_url"];
	        this.cover_image = source["cover_image"];
	        this.content_raw = source["content_raw"];
	        this.user_notes = source["user_notes"];
	        this.highlights = source["highlights"];
	        this.ai_summary = source["ai_summary"];
	        this.ai_key_points = source["ai_key_points"];
	        this.tags = source["tags"];
	        this.status_code = source["status_code"];
	        this.is_archived = source["is_archived"];
	        this.is_favorite = source["is_favorite"];
	        this.created_at = this.convertValues(source["created_at"], null);
	        this.updated_at = this.convertValues(source["updated_at"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class CategoryCount {
	    name: string;
	    count: number;
	
	    static createFrom(source: any = {}) {
	        return new CategoryCount(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.count = source["count"];
	    }
	}
	export class SubCategoryCount {
	    name: string;
	    domain: string;
	    count: number;
	
	    static createFrom(source: any = {}) {
	        return new SubCategoryCount(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.domain = source["domain"];
	        this.count = source["count"];
	    }
	}
	export class CategoryHierarchy {
	    name: string;
	    count: number;
	    sub_categories: SubCategoryCount[];
	
	    static createFrom(source: any = {}) {
	        return new CategoryHierarchy(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.count = source["count"];
	        this.sub_categories = this.convertValues(source["sub_categories"], SubCategoryCount);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ImportResult {
	    total_imported: number;
	    duplicates: number;
	    message: string;
	
	    static createFrom(source: any = {}) {
	        return new ImportResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.total_imported = source["total_imported"];
	        this.duplicates = source["duplicates"];
	        this.message = source["message"];
	    }
	}
	export class Stats {
	    total_bookmarks: number;
	    favorites: number;
	    archived: number;
	    total_tags: number;
	
	    static createFrom(source: any = {}) {
	        return new Stats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.total_bookmarks = source["total_bookmarks"];
	        this.favorites = source["favorites"];
	        this.archived = source["archived"];
	        this.total_tags = source["total_tags"];
	    }
	}
	
	export class Tag {
	    id: string;
	    name: string;
	    color: string;
	    count: number;
	
	    static createFrom(source: any = {}) {
	        return new Tag(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.color = source["color"];
	        this.count = source["count"];
	    }
	}

}

