const BACKEND = (process.env.PYLAB_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "https://pylab-production-d52a.up.railway.app").replace(/\/$/, "");

async function proxy(request, context) {
  const params = await context.params;
  const path = Array.isArray(params.path) ? params.path.join("/") : params.path || "";
  const url = `${BACKEND}/${path}${new URL(request.url).search}`;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const options = {
    method: request.method,
    headers,
    cache: "no-store",
  };

  if (!["GET", "HEAD"].includes(request.method)) {
    options.body = await request.text();
  }

  try {
    const response = await fetch(url, options);
    const body = await response.arrayBuffer();
    const responseHeaders = new Headers();
    const responseType = response.headers.get("content-type");
    if (responseType) responseHeaders.set("content-type", responseType);

    return new Response(body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return Response.json(
      { detail: "Backend-Verbindung fehlgeschlagen", error: error.message },
      { status: 502 }
    );
  }
}

export async function GET(request, context) {
  return proxy(request, context);
}

export async function POST(request, context) {
  return proxy(request, context);
}

export async function PUT(request, context) {
  return proxy(request, context);
}

export async function PATCH(request, context) {
  return proxy(request, context);
}

export async function DELETE(request, context) {
  return proxy(request, context);
}
