import { SETUP_HTML, SETUP_JS } from "./admin-page.js";
import { ADMIN_HTML, ADMIN_JS, ADMIN_CSS } from "./admin-v2.js";
const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer"
};

function isFirstParty(request) {
  const requestOrigin = new URL(request.url).origin;
  const clientOrigin = request.headers.get("Origin");
  return clientOrigin === requestOrigin || (
    request.headers.get("Sec-Fetch-Site") === "same-origin" &&
    (!clientOrigin || clientOrigin === requestOrigin)
  );
}
function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = [new URL(request.url).origin, env.APP_ORIGIN || "https://myprof.ca", "https://www.myprof.ca"];
  const headers = new Headers(JSON_HEADERS);
  headers.set("vary", "Origin");
  if (allowed.includes(origin)) {
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-allow-credentials", "true");
    headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
    headers.set("access-control-allow-headers", "Content-Type, Authorization, X-Setup-Token");
  }
  return headers;
}

function json(request, env, data, status = 200, extra = {}) {
  const headers = corsHeaders(request, env);
  for (const [key, value] of Object.entries(extra)) headers.set(key, value);
  return new Response(JSON.stringify(data), { status, headers });
}

function getCookie(request, name) {
  const raw = request.headers.get("Cookie") || "";
  for (const part of raw.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, "0")).join("");
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256(value) {
  return bytesToHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function hashPassword(password, saltHex) {
  const salt = saltHex
    ? Uint8Array.from(saltHex.match(/.{2}/g).map(x => parseInt(x, 16)))
    : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256);
  return { salt: bytesToHex(salt), hash: bytesToHex(bits) };
}

async function readJson(request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 100_000) throw new Error("Request too large");
  return await request.json();
}

async function currentAdmin(request, env) {
  const token = getCookie(request, "mp_admin");
  if (!token || !env.DB) return null;
  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(
    "SELECT u.id, u.email FROM admin_sessions s JOIN admin_users u ON u.id=s.user_id WHERE s.id_hash=? AND s.expires_at>?"
  ).bind(tokenHash, Math.floor(Date.now() / 1000)).first();
  return row || null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const origin = request.headers.get("Origin") || "";
    const allowed = [new URL(request.url).origin, env.APP_ORIGIN || "https://myprof.ca", "https://www.myprof.ca"];

    if (method === "OPTIONS") {
      if (!allowed.includes(origin) && !isFirstParty(request)) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    if (method === "GET" && path === "/admin/setup") {
      return new Response(SETUP_HTML, { headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
        "content-security-policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
      }});
    }
    if (method === "GET" && path === "/admin/assets/setup.js") {
      return new Response(SETUP_JS, { headers: { "content-type": "application/javascript; charset=utf-8", "cache-control": "no-store" }});
    }
    if (method === "GET" && ["/admin", "/admin/"].includes(path)) {
      return new Response(ADMIN_HTML, { headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
        "content-security-policy": "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
        "x-frame-options": "DENY"
      }});
    }
    if (method === "GET" && path === "/admin/assets/admin.js") {
      return new Response(ADMIN_JS, { headers: { "content-type": "application/javascript; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" }});
    }
    if (method === "GET" && path === "/admin/assets/admin.css") {
      return new Response(ADMIN_CSS, { headers: { "content-type": "text/css; charset=utf-8", "cache-control": "public, max-age=3600", "x-content-type-options": "nosniff" }});
    }

    if (path === "/" && method === "GET") {
      return json(request, env, { success: true, service: "MyProf AI API", status: "online" });
    }

    if (path === "/api/health" && method === "GET") {
      return json(request, env, { success: true, service: "MyProf AI", status: "running", version: "2.2" });
    }

    if (path.startsWith("/media/") && method === "GET") {
      if (!env.MEDIA) return new Response("Media storage is not configured", { status: 503 });
      const key = decodeURIComponent(path.slice(7));
      if (!/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(key)) return new Response("Not found", { status: 404 });
      const object = await env.MEDIA.get(key);
      if (!object) return new Response("Not found", { status: 404 });
      const headers = new Headers({
        "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff"
      });
      return new Response(object.body, { headers });
    }

    if (path.startsWith("/api/") && origin && !allowed.includes(origin) && !isFirstParty(request)) {
      return json(request, env, { success: false, message: "Origin not allowed" }, 403);
    }

    if (!env.DB) {
      return json(request, env, { success: false, message: "Database binding DB is not configured" }, 503);
    }

    try {
      if (path === "/api/admin/setup" && method === "POST") {
        if (!env.ADMIN_SETUP_TOKEN) return json(request, env, { success: false, message: "Setup is not configured" }, 503);
        const supplied = request.headers.get("X-Setup-Token") || "";
        if (supplied.length < 20 || supplied !== env.ADMIN_SETUP_TOKEN) {
          return json(request, env, { success: false, message: "Unauthorized" }, 401);
        }
        let stage = "DB_CHECK";
        try {
          const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM admin_users").first();
          if (Number(count?.n || 0) > 0) return json(request, env, { success: false, message: "Admin already initialized" }, 409);
          stage = "INPUT";
          const body = await readJson(request);
          const email = String(body.email || "").trim().toLowerCase();
          const password = String(body.password || "");
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || [...password].length < 14) {
            return json(request, env, { success: false, message: "Use a valid email and a password of at least 14 characters" }, 400);
          }
          stage = "PASSWORD_HASH";
          const { salt, hash } = await hashPassword(password);
          const id = crypto.randomUUID();
          stage = "ADMIN_INSERT";
          await env.DB.prepare("INSERT INTO admin_users (id,email,password_hash) VALUES (?,?,?)").bind(id, email, salt + ":" + hash).run();
          stage = "AUDIT_INSERT";
          try {
            await env.DB.prepare("INSERT INTO audit_log (id,actor_user_id,action,target_type,target_id) VALUES (?,?,?,?,?)")
              .bind(crypto.randomUUID(), id, "admin_initialized", "admin", id).run();
          } catch (auditError) {
            console.error("MyProf admin setup audit insert failed:", auditError);
          }
          return json(request, env, { success: true, message: "Admin account created. Remove ADMIN_SETUP_TOKEN after setup." }, 201);
        } catch (setupError) {
          console.error("MyProf admin setup failed at " + stage, setupError);
          return json(request, env, { success: false, message: "Setup could not be completed", error_code: "SETUP_" + stage }, 500);
        }
      }

            if (path === "/api/admin/login" && method === "POST") {
        const body = await readJson(request);
        const email = String(body.email || "").trim().toLowerCase();
        const password = String(body.password || "");
        const user = await env.DB.prepare("SELECT id,email,password_hash FROM admin_users WHERE email=?").bind(email).first();
        if (!user || !user.password_hash.includes(":")) return json(request, env, { success: false, message: "Invalid email or password" }, 401);
        const [salt, expected] = user.password_hash.split(":");
        const actual = (await hashPassword(password, salt)).hash;
        if (actual !== expected) return json(request, env, { success: false, message: "Invalid email or password" }, 401);
        const token = randomToken();
        const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 8;
        await env.DB.prepare("INSERT INTO admin_sessions (id_hash,user_id,expires_at) VALUES (?,?,?)").bind(await sha256(token), user.id, expires).run();
        await env.DB.prepare("UPDATE admin_users SET last_login_at=CURRENT_TIMESTAMP WHERE id=?").bind(user.id).run();
        return json(request, env, { success: true, user: { email: user.email } }, 200, {
          "set-cookie": "mp_admin=" + encodeURIComponent(token) + "; HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=28800"
        });
      }

      if (path === "/api/admin/logout" && method === "POST") {
        const token = getCookie(request, "mp_admin");
        if (token) await env.DB.prepare("DELETE FROM admin_sessions WHERE id_hash=?").bind(await sha256(token)).run();
        return json(request, env, { success: true }, 200, {
          "set-cookie": "mp_admin=; HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=0"
        });
      }

      if (path.startsWith("/api/admin/")) {
        const admin = await currentAdmin(request, env);
        if (!admin) return json(request, env, { success: false, message: "Authentication required" }, 401);

        if (path === "/api/admin/me" && method === "GET") {
          return json(request, env, { success: true, user: { email: admin.email } });
        }

        if (path === "/api/admin/public-catalog" && method === "GET") {
          const source=await fetch("https://myprof.ca/data/catalog.json", {
            headers: { "Accept": "application/json" },
            cf: { cacheTtl: 120 }
          });
          if (!source.ok) return json(request,env,{success:false,message:"تعذر تحميل كتالوج الموقع."},502);
          const catalog=await source.json();
          return json(request,env,{success:true,books:catalog.books||[],courses:catalog.courses||[]});
        }

        if (path === "/api/admin/products" && method === "GET") {
          const { results } = await env.DB.prepare("SELECT id,product_type,slug,title_ar,title_en,title_fr,description_ar,description_en,description_fr,cover_url,payhip_url,is_published,sort_order,created_at,updated_at FROM products ORDER BY sort_order,created_at DESC").all();
          return json(request, env, { success: true, products: results || [] });
        }



        // Internal editorial catalog. These records do not mutate the public
        // GitHub Pages catalog. No automated publishing is performed here.
        if (path === "/api/admin/products" && method === "POST") {
          const body = await readJson(request);
          const type = String(body.product_type || "");
          const title = String(body.title_ar || "").trim().slice(0, 180);
          if (!["book","course"].includes(type) || !title) {
            return json(request,env,{success:false,message:"حدد نوع المنتج وعنوانه بالعربية."},400);
          }
          const slug = "draft-" + crypto.randomUUID();
          const id = crypto.randomUUID();
          const fields = [
            title,String(body.title_en||"").trim().slice(0,180),
            String(body.title_fr||"").trim().slice(0,180),
            String(body.description_ar||"").trim().slice(0,6000),
            String(body.description_en||"").trim().slice(0,6000),
            String(body.description_fr||"").trim().slice(0,6000),
            String(body.cover_url||"").trim().slice(0,1000),
            String(body.payhip_url||"").trim().slice(0,1000)
          ];
          for (const urlField of fields.slice(6)) {
            if (urlField && !/^https:\/\//i.test(urlField)) return json(request,env,{success:false,message:"روابط الصورة والمنصة ينبغي أن تبدأ بـ https://"},400);
          }
          await env.DB.prepare("INSERT INTO products (id,product_type,slug,title_ar,title_en,title_fr,description_ar,description_en,description_fr,cover_url,payhip_url,is_published,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,0,0)")
            .bind(id,type,slug,...fields).run();
          return json(request,env,{success:true,id,message:"Saved to internal product library only."},201);
        }

        const productIdMatch = path.match(/^\/api\/admin\/products\/([a-f0-9-]{36})$/);
        if (productIdMatch && method === "POST") {
          const body = await readJson(request);
          const type = String(body.product_type || "");
          const title = String(body.title_ar || "").trim().slice(0,180);
          if (!["book","course"].includes(type) || !title) return json(request,env,{success:false,message:"حدد نوع المنتج وعنوانه بالعربية."},400);
          const fields=[
            type,title,String(body.title_en||"").trim().slice(0,180),
            String(body.title_fr||"").trim().slice(0,180),
            String(body.description_ar||"").trim().slice(0,6000),
            String(body.description_en||"").trim().slice(0,6000),
            String(body.description_fr||"").trim().slice(0,6000),
            String(body.cover_url||"").trim().slice(0,1000),
            String(body.payhip_url||"").trim().slice(0,1000)
          ];
          for(const urlField of fields.slice(7)) {
            if(urlField && !/^https:\/\//i.test(urlField)) return json(request,env,{success:false,message:"روابط الصورة والمنصة ينبغي أن تبدأ بـ https://"},400);
          }
          const result=await env.DB.prepare("UPDATE products SET product_type=?,title_ar=?,title_en=?,title_fr=?,description_ar=?,description_en=?,description_fr=?,cover_url=?,payhip_url=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
            .bind(...fields,productIdMatch[1]).run();
          return json(request,env,{success:true,updated:result.meta?.changes||0});
        }

        const productDelete = path.match(/^\/api\/admin\/products\/([a-f0-9-]{36})\/delete$/);
        if (productDelete && method === "POST") {
          const result=await env.DB.prepare("DELETE FROM products WHERE id=?").bind(productDelete[1]).run();
          return json(request,env,{success:true,deleted:result.meta?.changes||0});
        }

        if(path === "/api/admin/media" && method === "GET") {
          const {results}=await env.DB.prepare("SELECT id,object_key,mime_type,file_size,created_at FROM media_assets ORDER BY created_at DESC LIMIT 120").all();
          const base=new URL(request.url).origin;
          const media=(results||[]).map(item=>({...item,url:base+"/media/"+encodeURIComponent(item.object_key)}));
          return json(request,env,{success:true,media});
        }

        if(path === "/api/admin/overview" && method === "GET") {
          const [products,posts,media]=await Promise.all([
            env.DB.prepare("SELECT COUNT(*) AS n FROM products").first(),
            env.DB.prepare("SELECT COUNT(*) AS n FROM social_posts").first(),
            env.DB.prepare("SELECT COUNT(*) AS n FROM media_assets").first()
          ]);
          return json(request,env,{success:true,counts:{products:products?.n||0,posts:posts?.n||0,media:media?.n||0}});
        }

        const editPost = path.match(/^\/api\/admin\/posts\/([a-f0-9-]{36})$/);
        if (editPost && method === "POST") {
          const body=await readJson(request);
          const title=String(body.title||"").trim().slice(0,160);
          const caption=String(body.caption||"").trim().slice(0,5000);
          const platforms=Array.isArray(body.platforms)?[...new Set(body.platforms)]:[];
          if(!title||!caption||!platforms.length||platforms.some(p=>!["facebook","instagram","tiktok","youtube"].includes(p))) {
            return json(request,env,{success:false,message:"أدخل العنوان والنص واختر منصة واحدة على الأقل."},400);
          }
          const updated=await env.DB.prepare("UPDATE social_posts SET title=?,caption=?,platforms_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='draft'")
            .bind(title,caption,JSON.stringify(platforms),editPost[1]).run();
          return json(request,env,{success:true,updated:updated.meta?.changes||0});
        }

        if (path === "/api/admin/integrations" && method === "GET") {
          const integrations = {
            facebook: Boolean(env.META_PAGE_ACCESS_TOKEN && env.META_PAGE_ID),
            instagram: Boolean(env.META_PAGE_ACCESS_TOKEN && env.INSTAGRAM_USER_ID),
            tiktok: Boolean(env.TIKTOK_ACCESS_TOKEN),
            youtube: Boolean(env.YOUTUBE_CLIENT_ID && env.YOUTUBE_CLIENT_SECRET && env.YOUTUBE_REFRESH_TOKEN)
          };
          return json(request, env, { success: true, integrations });
        }

        if (path === "/api/admin/posts" && method === "GET") {
          const { results } = await env.DB.prepare(
            "SELECT id,title,caption,platforms_json,media_url,status,scheduled_at,published_at,created_at,updated_at FROM social_posts ORDER BY created_at DESC LIMIT 100"
          ).all();
          return json(request, env, { success: true, posts: results || [] });
        }

        if (path === "/api/admin/media" && method === "POST") {
          if (!env.MEDIA) return json(request, env, { success: false, message: "Media storage is not configured. Add the MEDIA R2 binding first." }, 503);
          const form = await request.formData();
          const file = form.get("file");
          if (!file || typeof file.stream !== "function") return json(request, env, { success: false, message: "Choose an image file." }, 400);
          if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return json(request, env, { success: false, message: "Only JPG, PNG, and WebP images are accepted." }, 415);
          if (file.size > 8 * 1024 * 1024) return json(request, env, { success: false, message: "Image must be 8 MB or smaller." }, 413);
          const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
          const key = crypto.randomUUID() + "." + ext;
          await env.MEDIA.put(key, file.stream(), {
            httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" },
            customMetadata: { uploadedBy: admin.id }
          });
          const mediaUrl = new URL("/media/" + key, request.url).toString();
          await env.DB.prepare("INSERT INTO media_assets (id,object_key,mime_type,file_size) VALUES (?,?,?,?)")
            .bind(crypto.randomUUID(), key, file.type, file.size).run();
          await env.DB.prepare("INSERT INTO audit_log (id,actor_user_id,action,target_type,target_id) VALUES (?,?,?,?,?)")
            .bind(crypto.randomUUID(), admin.id, "media_uploaded", "media", key).run();
          return json(request, env, { success: true, media_url: mediaUrl, object_key: key }, 201);
        }

        if (path === "/api/admin/posts" && method === "POST") {
          const body = await readJson(request);
          const title = String(body.title || "").trim().slice(0, 160);
          const caption = String(body.caption || "").trim().slice(0, 5000);
          const platforms = Array.isArray(body.platforms) ? [...new Set(body.platforms)] : [];
          const allowedPlatforms = ["facebook", "instagram", "tiktok", "youtube"];
          if (!title || !caption || !platforms.length || platforms.some(p => !allowedPlatforms.includes(p))) {
            return json(request, env, { success: false, message: "Add a title, caption, and at least one valid platform." }, 400);
          }
          const mediaUrl = String(body.media_url || "").trim();
          if (mediaUrl && !mediaUrl.startsWith(new URL("/media/", request.url).origin + "/media/")) {
            return json(request, env, { success: false, message: "Image must be uploaded through the private admin panel." }, 400);
          }
          const id = crypto.randomUUID();
          const scheduledAt = body.scheduled_at ? new Date(body.scheduled_at).toISOString() : null;
          await env.DB.prepare(
            "INSERT INTO social_posts (id,title,caption,platforms_json,media_url,status,scheduled_at,created_by) VALUES (?,?,?,?,?,'draft',?,?)"
          ).bind(id, title, caption, JSON.stringify(platforms), mediaUrl || null, scheduledAt, admin.id).run();
          await env.DB.prepare("INSERT INTO audit_log (id,actor_user_id,action,target_type,target_id,details_json) VALUES (?,?,?,?,?,?)")
            .bind(crypto.randomUUID(), admin.id, "social_post_created", "social_post", id, JSON.stringify({ platforms })).run();
          return json(request, env, { success: true, post: { id, title, caption, platforms, media_url: mediaUrl || null, status: "draft", scheduled_at: scheduledAt } }, 201);
        }

        const deletePost = path.match(/^\/api\/admin\/posts\/([a-f0-9-]{36})\/delete$/);
        if (deletePost && method === "POST") {
          const result = await env.DB.prepare("DELETE FROM social_posts WHERE id=?").bind(deletePost[1]).run();
          return json(request, env, { success: true, deleted: result.meta?.changes || 0 });
        }

        if (path === "/api/admin/sales/summary" && method === "GET") {

          const summary = await env.DB.prepare("SELECT COUNT(*) AS event_count, COALESCE(SUM(CASE WHEN event_type='paid' THEN amount_minor ELSE 0 END),0) AS paid_total_minor, COALESCE(MAX(currency),'') AS currency FROM sales_events").first();
          return json(request, env, { success: true, summary });
        }

        return json(request, env, { success: false, message: "Admin endpoint not found" }, 404);
      }

      return json(request, env, { success: false, message: "Endpoint not found" }, 404);
    } catch (error) {
      console.error("MyProf API error", error);
      return json(request, env, { success: false, message: "Request could not be completed" }, 500);
    }
  }
};
