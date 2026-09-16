function mapCatalogModels() {
  return getModelGroupsInOrder().flatMap(
    (group) => group.models.map((option) => ({
      id: option.id,
      label: option.label ?? option.name ?? option.id,
      description: option.description,
      category: group.label,
      reasoningEfforts: option.reasoningEfforts ? [...option.reasoningEfforts] : void 0,
      outputTokenLimit: getMaxOutputTokenLimit(option.id),
      vision: option.inputModalities ? option.inputModalities.includes("image") : inferVision(option.id, option.provider ?? ""),
      zdr: modelSupportsZdr(option.id),
      badge: option.badge
    }))
  );
}
function byokModelEntry(provider, model) {
  const id = `${provider.id}/${model.id}`;
  const label = model.name ?? model.id;
  const efforts = Array.isArray(model.reasoningEfforts) && model.reasoningEfforts.length > 0 ? [...model.reasoningEfforts] : void 0;
  return {
    id,
    label,
    description: `${label} — ${provider.name ?? provider.id} (custom)`,
    category: `${provider.name ?? provider.id} (byok)`,
    reasoningEfforts: efforts,
    outputTokenLimit: typeof model.maxOutput === "number" ? model.maxOutput : DEFAULT_DESKTOP_MAX_OUTPUT_TOKENS,
    vision: inferVision(id, provider.id),
    zdr: true
  };
}
function loadByokProvidersFromDisk() {
  try {
    const file = `${homedir()}/.commandcode/providers.json`;
    if (!existsSync(file)) return [];
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    const map = parsed?.provider ?? parsed?.providers;
    if (!map || typeof map !== "object") return [];
    const providers = [];
    for (const [id, raw] of Object.entries(map)) {
      if (!raw || typeof raw !== "object") continue;
      if (raw.disabled === true || raw.enabled === false) continue;
      const baseURL = typeof raw.baseURL === "string" ? raw.baseURL : typeof raw.options?.baseURL === "string" ? raw.options.baseURL : void 0;
      if (!baseURL) continue;
      const modelsObj = raw.models && typeof raw.models === "object" ? raw.models : {};
      const models = [];
      for (const [modelId, rawModel] of Object.entries(modelsObj)) {
        const model = rawModel && typeof rawModel === "object" ? rawModel : {};
        const efforts = Array.isArray(model.reasoningEfforts) ? model.reasoningEfforts.filter((effort) => typeof effort === "string") : model.reasoning === true ? ["low", "medium", "high"] : void 0;
        models.push({
          id: modelId,
          name: typeof model.name === "string" && model.name ? model.name : modelId,
          maxOutput: typeof model.maxOutput === "number" ? model.maxOutput : void 0,
          reasoningEfforts: efforts
        });
      }
      if (models.length === 0) continue;
      providers.push({
        id,
        name: typeof raw.name === "string" && raw.name ? raw.name : id,
        models
      });
    }
    return providers;
  } catch {
    return [];
  }
}
async function loadByokProviders() {
  try {
    const harness = await import("@commandcode/harness");
    if (typeof harness.loadProvidersConfig === "function" && typeof harness.createNodeRuntime === "function") {
      const loaded = await harness.loadProvidersConfig({
        runtime: harness.createNodeRuntime()
      });
      if (Array.isArray(loaded?.providers)) return loaded.providers;
    }
  } catch (error) {
    log.warn("[models] providers.json via harness failed", error);
  }
  return loadByokProvidersFromDisk();
}
async function fetchByokModels() {
  const providers = await loadByokProviders();
  return providers.flatMap(
    (provider) => (provider.models ?? []).map((model) => byokModelEntry(provider, model))
  );
}
async function fetchModels() {
  const catalog = mapCatalogModels();
  const byok = await fetchByokModels();
  const seen = new Set(catalog.map((model) => model.id));
  return [...catalog, ...byok.filter((model) => !seen.has(model.id))];
}
