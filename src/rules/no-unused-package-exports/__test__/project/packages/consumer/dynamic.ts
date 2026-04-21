// Dynamic imports are treated like barrel imports when populating
// `externallyImportedBy`: every entry-point export of `four` is marked as
// externally imported. `four` is dedicated to this test so the dynamic import
// doesn't blanket-mark exports in the other fixture packages.
async function load() {
  const mod = await import('four');
  console.log(mod);
}

void load();
