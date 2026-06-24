const studentFrameUrls = import.meta.glob("../../snapshot/assets/individual/students/*/move_*.png", {
  eager: true,
  import: "default",
});

const companionFrameUrls = import.meta.glob("../../snapshot/assets/individual/companions/*/*/move_*.png", {
  eager: true,
  import: "default",
});

const expeditionEnemyFrameUrls = import.meta.glob("../../snapshot/assets/individual/expedition-enemies/*/move_*.png", {
  eager: true,
  import: "default",
});

function requireAsset(modules, key, label) {
  const url = modules[key];
  if (!url) throw new Error(`${label} 자산 누락: ${key}`);
  return url;
}

function requireGender(gender, label) {
  if (gender !== "male" && gender !== "female") throw new Error(`${label} gender 값이 올바르지 않습니다: ${gender}`);
  return gender;
}

export function getStudentFrameUrls(gradeVisual, gender) {
  const safeGender = requireGender(gender, "학생 스프라이트");
  const directory = `student-${String(gradeVisual.order).padStart(2, "0")}-${safeGender}`;
  return [0, 1, 2, 3].map((frame) =>
    requireAsset(
      studentFrameUrls,
      `../../snapshot/assets/individual/students/${directory}/move_${frame}.png`,
      "학생 스프라이트",
    ),
  );
}

export function getCareerPortraitUrl(career, gender) {
  const safeGender = requireGender(gender, "직업 동료 초상");
  return requireAsset(
    companionFrameUrls,
    `../../snapshot/assets/individual/companions/${career.spriteAsset}/${safeGender}/move_0.png`,
    "직업 동료 초상",
  );
}

export function getCompanionFrameUrls(career, gender) {
  const safeGender = requireGender(gender, "직업 동료 스프라이트");
  return [0, 1, 2, 3].map((frame) =>
    requireAsset(
      companionFrameUrls,
      `../../snapshot/assets/individual/companions/${career.spriteAsset}/${safeGender}/move_${frame}.png`,
      "직업 동료 스프라이트",
    ),
  );
}

export function getHelperFrameUrls(spriteAsset, gender) {
  const safeGender = requireGender(gender, "학습 도우미 스프라이트");
  return [0, 1, 2, 3].map((frame) =>
    requireAsset(
      companionFrameUrls,
      `../../snapshot/assets/individual/companions/${spriteAsset}/${safeGender}/move_${frame}.png`,
      "학습 도우미 스프라이트",
    ),
  );
}

export function getExpeditionEnemyFrameUrls(assetId) {
  return [0, 1, 2, 3].map((frame) =>
    requireAsset(
      expeditionEnemyFrameUrls,
      `../../snapshot/assets/individual/expedition-enemies/${assetId}/move_${frame}.png`,
      "원정대 적 스프라이트",
    ),
  );
}
