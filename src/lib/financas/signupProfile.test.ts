import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { ageFrom, formatPhone, validateSignupProfile } from "./signupProfile";

const today = new Date(2026, 10, 11); // 11/11/2026
const ok = { data_nascimento: "1990-05-20", sexo: "feminino", telefone: "(11) 91234-5678", cidade: "São Paulo", uf: "SP" };

describe("dados do cadastro do Invex Finanças", () => {
  it("calcula a idade considerando se já fez aniversário", () => {
    assert.equal(ageFrom("1990-11-11", today), 36);
    assert.equal(ageFrom("1990-11-12", today), 35);
  });
  it("aceita um cadastro completo", () => {
    assert.equal(validateSignupProfile(ok, today), null);
  });
  it("exige idade mínima de 13 anos", () => {
    assert.match(validateSignupProfile({ ...ok, data_nascimento: "2014-01-01" }, today) ?? "", /13 anos/);
  });
  it("exige telefone com DDD", () => {
    assert.match(validateSignupProfile({ ...ok, telefone: "91234-5678" }, today) ?? "", /DDD/);
  });
  it("exige escolher o sexo", () => {
    assert.match(validateSignupProfile({ ...ok, sexo: "" }, today) ?? "", /sexo/);
  });
  it("formata o celular", () => {
    assert.equal(formatPhone("11912345678"), "(11) 91234-5678");
  });
});
