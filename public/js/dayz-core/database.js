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
  }
};