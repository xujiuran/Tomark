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
	export class Bookmark {
	    id: string;
	    url: string;
	    title: string;
	    description: string;
	    favicon_url: string;
	    cover_image: string;
	    content_raw: string;
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
	        this.favicon_url = source["favicon_url"];
	        this.cover_image = source["cover_image"];
	        this.content_raw = source["content_raw"];
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

