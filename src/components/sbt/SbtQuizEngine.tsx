import React, { useState } from 'react';
import { SbtQuestion, SBT_QUESTIONS, QuestionDifficulty } from '../../data/sbtQuestionsData';
import { AUTHORITATIVE_SBT_MODELS } from '../../data/sbtModelsSourceData';
import { SbtDeterministicChart } from './SbtDeterministicChart';
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Trophy,
  Award,
  BookOpen,
  Filter,
  Layers,
  Check,
  Zap,
} from 'lucide-react';

interface SbtQuizEngineProps {
  initialModelFilter?: string; // e.g. 'SBT-01' or 'ALL'
  onQuizCompleted?: (score: number, total: number) => void;
}

export const SbtQuizEngine: React.FC<SbtQuizEngineProps> = ({
  initialModelFilter = 'ALL',
  onQuizCompleted,
}) => {
  const [modelFilter, setModelFilter] = useState<string>(initialModelFilter);
  const [difficultyFilter, setDifficultyFilter] = useState<string>('ALL');

  // Filter questions based on selections
  const filteredQuestions = SBT_QUESTIONS.filter((q) => {
    if (modelFilter !== 'ALL' && q.modelId && q.modelId !== modelFilter) return false;
    if (difficultyFilter !== 'ALL' && q.difficulty !== difficultyFilter) return false;
    return true;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  // If filtered list is empty, fallback
  const activeQuestions = filteredQuestions.length > 0 ? filteredQuestions : SBT_QUESTIONS;
  const currentQuestion: SbtQuestion = activeQuestions[currentIndex] || activeQuestions[0];

  const handleSelectOption = (idx: number) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(idx);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null) return;
    setIsAnswerSubmitted(true);
    if (selectedOption === currentQuestion.correctAnswerIndex) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < activeQuestions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    } else {
      setQuizFinished(true);
      if (onQuizCompleted) {
        onQuizCompleted(score + (selectedOption === currentQuestion.correctAnswerIndex ? 1 : 0), activeQuestions.length);
      }
    }
  };

  const handleRestartQuiz = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setQuizFinished(false);
  };

  // Find associated model if question is linked
  const associatedModel = currentQuestion.modelId
    ? AUTHORITATIVE_SBT_MODELS.find((m) => m.id === currentQuestion.modelId)
    : undefined;

  // Quiz Finished Result Screen
  if (quizFinished) {
    const accuracy = Math.round((score / activeQuestions.length) * 100);
    let rankTitle = 'SBT NOVICE';
    let rankColor = 'text-slate-400';
    let badgeColor = 'border-slate-700 bg-slate-800';

    if (accuracy >= 90) {
      rankTitle = 'SBT MASTER OPERATOR';
      rankColor = 'text-amber-400';
      badgeColor = 'border-amber-500/50 bg-amber-500/20';
    } else if (accuracy >= 75) {
      rankTitle = 'SENIOR STRUCTURE ANALYST';
      rankColor = 'text-emerald-400';
      badgeColor = 'border-emerald-500/50 bg-emerald-500/20';
    } else if (accuracy >= 50) {
      rankTitle = 'JUNIOR APPRENTICE';
      rankColor = 'text-blue-400';
      badgeColor = 'border-blue-500/50 bg-blue-500/20';
    }

    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-2xl text-center space-y-6 max-w-2xl mx-auto">
        <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-lg shadow-amber-500/10">
          <Trophy className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono-code text-slate-400 uppercase tracking-widest">
            KNOWLEDGE ASSESSMENT COMPLETE
          </span>
          <h2 className="text-3xl font-military font-bold text-slate-100">
            {score} / {activeQuestions.length} CORRECT
          </h2>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-military font-bold tracking-widest uppercase">
            <span className={rankColor}>{rankTitle}</span>
            <span className="text-slate-400 font-mono-code">({accuracy}%)</span>
          </div>
        </div>

        <p className="text-xs font-mono-code text-slate-400 max-w-md mx-auto leading-relaxed">
          {accuracy >= 75
            ? 'Exceptional institutional comprehension. You have demonstrated rigorous understanding of SBT Models and strict PDF execution rules.'
            : 'Review the authoritative PDF rules and 3D diagrams in the Model Library to refine your accuracy on invalidation and entry criteria.'}
        </p>

        <div className="pt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleRestartQuiz}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-military font-bold tracking-wider transition cursor-pointer shadow-md shadow-amber-500/20"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESTART QUIZ</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quiz Controls & Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <HelpCircle className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-military font-bold text-slate-100 tracking-wider">
              SBT Q&A / KNOWLEDGE ENGINE
            </h3>
            <p className="text-[11px] font-mono-code text-slate-400">
              Question {currentIndex + 1} of {activeQuestions.length} • Model ID, Rules & Execution
            </p>
          </div>
        </div>

        {/* Model & Difficulty Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Model Filter */}
          <select
            value={modelFilter}
            onChange={(e) => {
              setModelFilter(e.target.value);
              setCurrentIndex(0);
              setSelectedOption(null);
              setIsAnswerSubmitted(false);
            }}
            aria-label="Filter questions by SBT model"
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono-code text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All 10 SBT Models</option>
            {AUTHORITATIVE_SBT_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                Model {m.modelNumber}: {m.title.slice(0, 24)}...
              </option>
            ))}
          </select>

          {/* Difficulty Filter */}
          <select
            value={difficultyFilter}
            onChange={(e) => {
              setDifficultyFilter(e.target.value);
              setCurrentIndex(0);
              setSelectedOption(null);
              setIsAnswerSubmitted(false);
            }}
            aria-label="Filter questions by difficulty"
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono-code text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Difficulties</option>
            <option value="FOUNDATION">Foundation</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
            <option value="MASTER">Master</option>
          </select>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-500 transition-all duration-300 rounded-full"
          style={{ width: `${((currentIndex + 1) / activeQuestions.length) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xl space-y-6">
        {/* Question Header Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono-code font-bold">
              {currentQuestion.type.replace('_', ' ')}
            </span>
            <span className="px-2.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-mono-code font-bold">
              {currentQuestion.difficulty}
            </span>
            {associatedModel && (
              <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono-code font-bold">
                Model {associatedModel.modelNumber}: {associatedModel.title}
              </span>
            )}
          </div>

          <div className="text-xs font-mono-code text-slate-400">
            Score: <span className="text-amber-400 font-bold">{score}</span> / {currentIndex}
          </div>
        </div>

        {/* Prompt */}
        <div className="space-y-1">
          <h2 className="text-lg sm:text-xl font-military font-bold text-slate-100 leading-snug">
            {currentQuestion.prompt}
          </h2>
          {currentQuestion.subtext && (
            <p className="text-xs font-mono-code text-slate-400">
              {currentQuestion.subtext}
            </p>
          )}
        </div>

        {/* Optional Diagram Context (if question links to a model diagram) */}
        {associatedModel && currentQuestion.type === 'MODEL_ID' && (
          <div className="my-3 max-w-xl mx-auto">
            <SbtDeterministicChart model={associatedModel} />
          </div>
        )}

        {/* Answer Options Grid */}
        <div className="space-y-2.5">
          {currentQuestion.options.map((option, idx) => {
            const isSelected = selectedOption === idx;
            const isCorrect = idx === currentQuestion.correctAnswerIndex;

            let buttonStyle = 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850';

            if (isAnswerSubmitted) {
              if (isCorrect) {
                buttonStyle = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200 shadow-md shadow-emerald-500/10';
              } else if (isSelected && !isCorrect) {
                buttonStyle = 'bg-rose-500/20 border-rose-500/50 text-rose-200';
              } else {
                buttonStyle = 'bg-slate-950/40 border-slate-900 text-slate-500 opacity-60';
              }
            } else if (isSelected) {
              buttonStyle = 'bg-amber-500/15 border-amber-500/50 text-amber-200 shadow-md shadow-amber-500/10';
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={isAnswerSubmitted}
                onClick={() => handleSelectOption(idx)}
                className={`w-full p-4 rounded-xl border text-left font-mono-code text-xs sm:text-sm flex items-start justify-between gap-3 transition cursor-pointer ${buttonStyle}`}
              >
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="leading-relaxed">{option}</span>
                </div>

                {isAnswerSubmitted && isCorrect && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                )}
                {isAnswerSubmitted && isSelected && !isCorrect && (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Feedback Section (shown after submitting) */}
        {isAnswerSubmitted && (
          <div
            className={`p-4 rounded-xl border space-y-2 transition-all ${
              selectedOption === currentQuestion.correctAnswerIndex
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-military font-bold text-xs tracking-wider">
                {selectedOption === currentQuestion.correctAnswerIndex ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>CORRECT INSTITUTIONAL EXECUTION</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-rose-400" />
                    <span>INCORRECT RULE APPLICATION</span>
                  </>
                )}
              </div>

              <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                {currentQuestion.sourceRuleCitation}
              </span>
            </div>

            <p className="text-xs font-mono-code text-slate-300 leading-relaxed">
              {currentQuestion.explanation}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] font-mono-code text-slate-500">
            {isAnswerSubmitted
              ? 'Review explanation above and proceed to next question'
              : 'Select an answer to proceed'}
          </span>

          {!isAnswerSubmitted ? (
            <button
              type="button"
              disabled={selectedOption === null}
              onClick={handleSubmitAnswer}
              className={`px-6 py-2.5 rounded-xl text-xs font-military font-bold tracking-wider transition ${
                selectedOption !== null
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
              }`}
            >
              CONFIRM ANSWER
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNextQuestion}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-military font-bold tracking-wider transition cursor-pointer shadow-md shadow-amber-500/20"
            >
              <span>{currentIndex + 1 < activeQuestions.length ? 'NEXT QUESTION' : 'VIEW FINAL RESULTS'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
