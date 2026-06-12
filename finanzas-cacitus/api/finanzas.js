export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Método no permitido" });
  }

  const appsScriptUrl = process.env.APPS_SCRIPT_URL;

  if (!appsScriptUrl) {
    return response.status(500).json({
      error: "APPS_SCRIPT_URL no está configurada en las variables de entorno."
    });
  }

  try {
    const apiResponse = await fetch(appsScriptUrl);

    if (!apiResponse.ok) {
      return response.status(apiResponse.status).json({
        error: "No se pudo consultar la API de Google Apps Script."
      });
    }

    const payload = await apiResponse.json();
    response.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return response.status(200).json(payload);
  } catch (error) {
    return response.status(500).json({
      error: "Error interno al sincronizar datos financieros."
    });
  }
}
