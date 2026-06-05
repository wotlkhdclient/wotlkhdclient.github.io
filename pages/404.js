export default async function ({ template, t }) {
  document.title = `${t.notfound_title} | WotLK HD Client`;
  return Mustache.render(template, { t });
}
