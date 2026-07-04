import h from"express";import*as v from"helmet";import G from"cors";import"dotenv/config";import F from"pg";var{Pool:M}=F;async function N(){let s=process.env.POSTGRES_URL;if(!s)console.error("DEBUG: POSTGRES_URL is undefined or empty");else{let t=s.replace(/:([^:@]+)@/,":***@");console.log("DEBUG: POSTGRES_URL value is:",t)}let o=new M({connectionString:s,ssl:{rejectUnauthorized:!1}}),r=await o.connect();try{return await r.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        descricao TEXT,
        categoria TEXT,
        subcategoria TEXT,
        marca TEXT,
        modelo TEXT,
        material TEXT,
        cor TEXT,
        tamanho TEXT,
        quantidade_em_estoque INTEGER NOT NULL,
        estoque_minimo INTEGER NOT NULL DEFAULT 0,
        preco REAL NOT NULL,
        preco_promocional REAL,
        peso REAL,
        imagens TEXT,
        data_de_cadastro TEXT NOT NULL,
        ativo INTEGER NOT NULL DEFAULT 1
      );
    `),await r.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        data TEXT NOT NULL,
        cliente TEXT,
        itens TEXT NOT NULL,
        valor_total REAL NOT NULL,
        forma_pagamento TEXT NOT NULL,
        status_venda TEXT NOT NULL
      );
    `),await r.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        nome TEXT,
        foto TEXT,
        google_id TEXT UNIQUE,
        status TEXT DEFAULT 'pendente'
      );
    `),o}finally{r.release()}}import{z as n}from"zod";import C from"jsonwebtoken";var l=(s,o,r)=>{let t=s.headers.authorization;if(!t)return o.status(401).json({error:"Token n\xE3o fornecido"});let e=t.split(" ");if(e.length!==2)return o.status(401).json({error:"Erro no token"});let[i,u]=e;if(!/^Bearer$/i.test(i))return o.status(401).json({error:"Token malformatado"});C.verify(u,process.env.JWT_SECRET,(m,a)=>m?o.status(401).json({error:"Token inv\xE1lido"}):(s.userId=a.id,s.userStatus=a.status,r()))},R=(s,o,r)=>{let t=s.userStatus;if(t!=="aprovado"&&t!=="admin")return o.status(403).json({error:"Acesso negado"});r()};var b=n.object({nome:n.string().min(1),descricao:n.string().optional(),categoria:n.string().optional(),subcategoria:n.string().optional(),marca:n.string().optional(),modelo:n.string().optional(),material:n.string().optional(),cor:n.string().optional(),tamanho:n.string().optional(),quantidade_em_estoque:n.number().int().nonnegative(),estoque_minimo:n.number().int().nonnegative(),preco:n.number().positive(),preco_promocional:n.number().positive().optional(),peso:n.number().positive().optional(),imagens:n.array(n.string()).optional(),ativo:n.union([n.literal(0),n.literal(1)]).default(1)});function L(s,o){s.post("/products",l,R,async(r,t)=>{let e=b.safeParse(r.body);if(!e.success)return t.status(400).json(e.error);let{nome:i,descricao:u,categoria:m,subcategoria:a,marca:c,modelo:p,material:d,cor:g,tamanho:T,quantidade_em_estoque:f,estoque_minimo:U,preco:I,preco_promocional:j,peso:P,imagens:y,ativo:A}=e.data,x=new Date().toISOString(),X=y?JSON.stringify(y):null;try{let q=await o.query(`
                INSERT INTO products (
                    nome, descricao, categoria, subcategoria, marca, modelo, material, cor, tamanho, 
                    quantidade_em_estoque, estoque_minimo, preco, preco_promocional, peso, imagens, data_de_cadastro, ativo
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                RETURNING *
            `,[i,u,m,a,c,p,d,g,T,f,U,I,j,P,X,x,A]);t.status(201).json(q.rows[0])}catch{t.status(500).json({error:"Erro ao cadastrar produto."})}}),s.get("/products",l,async(r,t)=>{try{let e=await o.query("SELECT * FROM products");t.json(e.rows)}catch{t.status(500).json({error:"Erro ao buscar produtos."})}}),s.put("/products/:id",l,R,async(r,t)=>{let e=r.body,i=Object.keys(e).filter(a=>a!=="id");if(i.length===0)return t.status(400).json({error:"Nenhum campo para atualizar."});let u=i.map(a=>a==="imagens"?JSON.stringify(e[a]):e[a]),m=i.map((a,c)=>`${a} = $${c+1}`).join(", ");u.push(r.params.id);try{let a=await o.query(`UPDATE products SET ${m} WHERE id = $${u.length} RETURNING *`,u);t.json(a.rows[0])}catch{t.status(500).json({error:"Erro ao atualizar."})}}),s.delete("/products/:id",l,R,async(r,t)=>{try{await o.query("DELETE FROM products WHERE id = $1",[r.params.id]),t.status(204).send()}catch{t.status(500).json({error:"Erro ao excluir."})}})}function S(s,o){s.post("/sales",async(r,t)=>{let{data:e,cliente:i,itens:u,valor_total:m,forma_pagamento:a,status_venda:c}=r.body,p=await o.connect();try{await p.query("BEGIN");let d=typeof u=="string"?JSON.parse(u):u;for(let T of d){if((await p.query("SELECT quantidade_em_estoque FROM products WHERE id = $1",[T.produtoId])).rows[0].quantidade_em_estoque<T.quantidade)throw new Error("Estoque insuficiente");await p.query("UPDATE products SET quantidade_em_estoque = quantidade_em_estoque - $1 WHERE id = $2",[T.quantidade,T.produtoId])}let g=await p.query("INSERT INTO sales (data, cliente, itens, valor_total, forma_pagamento, status_venda) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",[e,i,JSON.stringify(d),m,a,c]);await p.query("COMMIT"),t.status(201).json(g.rows[0])}catch(d){await p.query("ROLLBACK"),t.status(400).json({error:d.message})}finally{p.release()}}),s.get("/sales",async(r,t)=>{try{let e=await o.query("SELECT * FROM sales");t.json(e.rows.map(i=>({...i,itens:JSON.parse(i.itens)})))}catch{t.status(500).json({error:"Erro ao buscar vendas."})}})}import D from"jsonwebtoken";function _(s,o){s.post("/auth/google",async(r,t)=>{let{email:e,nome:i,foto:u,google_id:m}=r.body;try{if(!e)return t.status(400).json({error:"Email obrigat\xF3rio"});let c=(await o.query("SELECT id, status FROM users WHERE email = $1",[e])).rows[0];if(!c)return await o.query("INSERT INTO users (id, email, nome, foto, google_id, status) VALUES ($1, $2, $3, $4, $5, 'pendente')",[m,e,i,u,m]),t.status(403).json({message:"Aguarde aprova\xE7\xE3o",status:"pendente"});if(c.status==="pendente")return t.status(403).json({error:"Acesso pendente de aprova\xE7\xE3o."});let p=D.sign({id:c.id,status:c.status},process.env.JWT_SECRET,{expiresIn:"7d"});t.status(200).json({token:p,email:e,status:c.status})}catch(a){console.error("Erro em /auth/google:",a),t.status(500).json({error:"Erro interno",details:a.message||a})}}),s.get("/admin/users/pending",async(r,t)=>{try{let e=await o.query("SELECT * FROM users WHERE status = 'pendente'");t.status(200).json(e.rows)}catch{t.status(500).json({error:"Erro ao buscar"})}}),s.post("/admin/users/decide",async(r,t)=>{let{id:e,action:i}=r.body;try{i==="aprovado"?await o.query("UPDATE users SET status = $1 WHERE id = $2",["aprovado",e]):await o.query("DELETE FROM users WHERE id = $1",[e]),t.status(200).json({message:"Sucesso"})}catch{t.status(500).json({error:"Erro ao processar"})}})}function w(s,o){s.get("/reports/dashboard",l,async(r,t)=>{try{let e=await o.query("SELECT SUM(valor_total) as total FROM sales WHERE status_venda = $1",["Conclu\xEDda"]),i=await o.query("SELECT COUNT(*) as total FROM products"),u=await o.query("SELECT COUNT(*) as total FROM sales");t.json({totalRevenue:parseFloat(e.rows[0].total)||0,totalProducts:parseInt(i.rows[0].total),totalSales:parseInt(u.rows[0].total)})}catch{t.status(500).json({error:"Erro ao gerar relat\xF3rio."})}})}function O(s,o){L(s,o),S(s,o),_(s,o),w(s,o)}var E=h(),$=process.env.PORT||2020;E.use(v.default());E.use(h.json({limit:"10mb"}));E.use(G({origin:["https://mago-imports-system.vercel.app","https://mago-imports-interface.vercel.app","https://magoimportsinterface.vercel.app","http://localhost:3000"].filter(Boolean)}));async function W(){try{let s=await N();O(E,s),E.get("/",(o,r)=>{r.status(200).json({message:"Mago Imports API Online",status:"online"})}),E.use((o,r,t,e)=>{console.error(o.stack),t.status(500).json({error:"Erro interno no servidor."})}),E.listen($,()=>{console.log(`Server running on port ${$}`)})}catch(s){console.error("Erro cr\xEDtico na inicializa\xE7\xE3o:",s),process.exit(1)}}W();
