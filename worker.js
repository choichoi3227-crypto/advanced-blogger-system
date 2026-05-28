export default {

 async fetch(request,env){

  const url=new URL(request.url);

  const headers={

   'content-type':'application/json;charset=UTF-8',

   'access-control-allow-origin':'*',

   'cache-control':'public,max-age=86400',

   'x-powered-by':'Advanced-Blogger-System'

  };

  const GITHUB_TOKEN=env.GITHUB_TOKEN;

  const GITHUB_OWNER='choichoi3227-crypto';

  const GITHUB_REPO='storage';

  const GITHUB_BRANCH='main';

  /* HEALTH */

  if(url.pathname==='/api/health'){

   return new Response(

    JSON.stringify({

     success:true,

     status:'ok',

     version:'2.0.0'

    }),

    {headers}

   );

  }

  /* POST */

  if(url.pathname==='/api/post'){

   try{

    const id=url.searchParams.get('id');

    if(!id){

     return new Response(

      JSON.stringify({
       success:false,
       error:'Missing id'
      }),

      {
       status:400,
       headers
      }

     );

    }

    const cacheKey=`post_${id}`;

    const cached=await env.CACHE.get(cacheKey);

    if(cached){

     return new Response(cached,{headers});

    }

    const result=await env.DB.prepare(

     'SELECT * FROM posts WHERE id=?'

    ).bind(id).first();

    const json=JSON.stringify(result||{});

    await env.CACHE.put(

     cacheKey,

     json,

     {
      expirationTtl:86400
     }

    );

    return new Response(json,{headers});

   }catch(e){

    return new Response(

     JSON.stringify({
      success:false,
      error:e.toString()
     }),

     {
      status:500,
      headers
     }

    );

   }

  }

  /* GITHUB UPLOAD */

  if(
   url.pathname==='/api/upload'
   &&
   request.method==='POST'
  ){

   try{

    const body=await request.json();

    const path=body.path;

    const content=body.content;

    if(!path || !content){

     return new Response(

      JSON.stringify({
       success:false,
       error:'Missing path/content'
      }),

      {
       status:400,
       headers
      }

     );

    }

    const githubUrl=

     `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;

    const encoded=btoa(
     unescape(
      encodeURIComponent(content)
     )
    );

    const githubResponse=await fetch(

     githubUrl,

     {

      method:'PUT',

      headers:{

       'Authorization':`Bearer ${GITHUB_TOKEN}`,

       'Accept':'application/vnd.github+json',

       'Content-Type':'application/json'

      },

      body:JSON.stringify({

       message:`Upload ${path}`,

       content:encoded,

       branch:GITHUB_BRANCH

      })

     }

    );

    const data=await githubResponse.json();

    return new Response(

     JSON.stringify({
      success:true,
      data
     }),

     {headers}

    );

   }catch(e){

    return new Response(

     JSON.stringify({
      success:false,
      error:e.toString()
     }),

     {
      status:500,
      headers
     }

    );

   }

  }

  /* KV */

  if(url.pathname==='/api/cache'){

   const key=url.searchParams.get('key');

   let value=await env.CACHE.get(key);

   if(!value){

    value=JSON.stringify({
     key,
     created:Date.now()
    });

    await env.CACHE.put(

     key,

     value,

     {
      expirationTtl:86400
     }

    );

   }

   return new Response(value,{headers});

  }

  return new Response(

   JSON.stringify({
    success:false,
    error:'Not Found'
   }),

   {
    status:404,
    headers
   }

  );

 }

}
