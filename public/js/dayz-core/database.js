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
  const spawnable =
    this.getSpawnableVariant(classname, mapId);

  const customAttachments =
    this.getCustomAttachments(classname);

  const resolveGroup = (group) => {
    const entries = [];

    (group.items || []).forEach(item => {
      entries.push({
        type: "item",
        name: item.name,
        chance: item.chance,
        source: "vanilla"
      });
    });

    (group.presets || []).forEach(presetRef => {
      const preset =
        this.getPresetVariant(
          presetRef.name,
          mapId
        );

      entries.push({
        type: "preset",
        name: presetRef.name,
        chance: presetRef.chance,
        items: preset?.items || [],
        source: "vanilla"
      });
    });

    return {
      chance: group.chance,
      entries
    };
  };

  const vanillaGroups =
    spawnable && Array.isArray(spawnable.attachments)
      ? spawnable.attachments.map(resolveGroup)
      : [];

  const customGroup = {
    chance: 1,
    entries: customAttachments.map(name => ({
      type: "item",
      name,
      chance: 1,
      source: "custom"
    }))
  };

  const attachments = [...vanillaGroups];

  if (customGroup.entries.length) {
    attachments.push(customGroup);
  }

  return {
    classname,

    damage:
      spawnable?.damage || null,

    attachments,

    cargo:
      spawnable && Array.isArray(spawnable.cargo)
        ? spawnable.cargo.map(resolveGroup)
        : []
  };
},

getCustomAttachments(classname) {
  return (
    window.DAYZ_CUSTOM_RELATIONS?.attachments?.[classname] ||
    []
  );
}

};

