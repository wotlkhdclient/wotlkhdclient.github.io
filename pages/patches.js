export default async function ({ template, t }) {
  document.title = `${t.home_title} | WotLK HD Client`;
  return Mustache.render(template, { t });
}

export async function after({ params, query, t }) {
  
}