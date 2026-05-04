"use strict";

function randomId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

function initVars(context, _events, done) {
  context.vars.slug = process.env.QUIZ_SLUG || "room1";
  context.vars.nickname = randomId("load");
  context.vars.deviceId = randomId("dev");
  context.vars.quizId = process.env.QUIZ_ID || "";
  context.vars.questionId = process.env.QUESTION_ID || "";
  context.vars.optionId = process.env.OPTION_ID || "";
  return done();
}

function emitSubmitIfConfigured(context, events, done) {
  const { quizId, questionId, optionId } = context.vars;
  if (!quizId || !questionId || !optionId) return done();
  return events.emit(
    "emit",
    {
      channel: "answer:submit",
      data: {
        quizId,
        questionId,
        optionIds: [optionId],
      },
    },
    done,
  );
}

module.exports = {
  initVars,
  emitSubmitIfConfigured,
};
