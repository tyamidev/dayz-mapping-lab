window.DayZDatabase = {
  getItem(classname) {
    return (window.DAYZ_CORE_ITEMS || [])
      .find(item => item.classname === classname) || null;
  },

  getSpawnableType(classname) {
    return (window.DAYZ_CORE_SPAWNABLE_TYPES || [])
      .find(item => item.classname === classname) || null;
  },

  getPreset(name) {
    return (window.DAYZ_CORE_PRESETS || [])
      .find(preset => preset.name === name) || null;
  },

  getItemsByCategory(category) {
    return (window.DAYZ_CORE_ITEMS || [])
      .filter(item => item.category === category);
  },

  searchItems(query) {
    const q = String(query || "").toLowerCase();

    return (window.DAYZ_CORE_ITEMS || [])
      .filter(item =>
        item.classname.toLowerCase().includes(q) ||
        item.label.toLowerCase().includes(q)
      );
  },

  getVanillaItemsForMap(mapId) {
    return (window.DAYZ_CORE_ITEMS || [])
      .filter(item =>
        item.vanillaMaps &&
        item.vanillaMaps[mapId]
      );
  },

getSpawnableVariant(classname, mapId = "chernarusplus") {
  const entry = this.getSpawnableType(classname);

  if (!entry) return null;

  return entry.variants?.[mapId] || null;
},

getPresetVariant(name, mapId = "chernarusplus") {
  const preset = this.getPreset(name);

  if (!preset) return null;

  return preset.variants?.[mapId] || null;
},

getResolvedSpawnData(classname, mapId = "chernarusplus") {
  const spawnable = this.getSpawnableVariant(classname, mapId);

  if (!spawnable) {
    return {
      classname,
      attachments: [],
      cargo: []
    };
  }

  const resolveSection = (section) => {
    if (!section) return [];

    const result = [];

    (section.items || []).forEach(item => {
      result.push({
        type: "item",
        name: item.name,
        chance: item.chance
      });
    });

    (section.presets || []).forEach(presetRef => {
      const preset = this.getPresetVariant(presetRef.name, mapId);

      if (!preset) {
        result.push({
          type: "preset",
          name: presetRef.name,
          chance: presetRef.chance,
          items: []
        });

        return;
      }

      result.push({
        type: "preset",
        name: presetRef.name,
        chance: presetRef.chance,
        items: preset.items || []
      });
    });

    return result;
  };

  return {
    classname,
    damage: spawnable.damage || null,
    attachmentsChance: spawnable.attachments?.chance ?? null,
    attachments: resolveSection(spawnable.attachments),
    cargoChance: spawnable.cargo?.chance ?? null,
    cargo: resolveSection(spawnable.cargo)
  };
}
};

