// Prueba rápida del peso de Inter que usa ThemedText en Android:
// node --experimental-strip-types --test scripts/smoke-fonts.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { interFamilyForWeight } from "../src/fontWeights.ts";

test("cada fontWeight elige la variante de Inter que corresponde", () => {
  assert.equal(interFamilyForWeight(undefined), "Inter_400Regular");
  assert.equal(interFamilyForWeight("normal"), "Inter_400Regular");
  assert.equal(interFamilyForWeight("300"), "Inter_400Regular");
  assert.equal(interFamilyForWeight("500"), "Inter_500Medium");
  assert.equal(interFamilyForWeight("600"), "Inter_600SemiBold");
  assert.equal(interFamilyForWeight("bold"), "Inter_700Bold");
  assert.equal(interFamilyForWeight(700), "Inter_700Bold");
  assert.equal(interFamilyForWeight("800"), "Inter_800ExtraBold");
  assert.equal(interFamilyForWeight("900"), "Inter_900Black");
  assert.equal(interFamilyForWeight("cualquiera"), "Inter_400Regular");
});
