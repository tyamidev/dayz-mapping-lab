window.DayZCore = window.DayZCore || {};

DayZCore.getMap = function(mapId) {
  return DAYZ_MAPS[mapId] || null;
};

DayZCore.getMaps = function() {
  return Object.values(DAYZ_MAPS);
};

DayZCore.mapExists = function(mapId) {
  return Boolean(DAYZ_MAPS[mapId]);
};

DayZCore.normalizeClassname = function(value) {
  return String(value || "").trim();
};

DayZCore.unique = function(values) {
  return [...new Set(values)];
};

DayZCore.sortByName = function(values) {
  return [...values].sort((a, b) =>
    String(a.name || a).localeCompare(
      String(b.name || b),
      undefined,
      { sensitivity: "base" }
    )
  );
};