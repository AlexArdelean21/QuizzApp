"use client"

import { useState, useEffect } from "react"
import { QuizHeader } from "./quiz-header"
import { QuestionCard } from "./question-card"
import { AnswerOptions } from "./answer-options"
import { QuizNavigation } from "./quiz-navigation"

// Sample quiz data
const quizData = {
  examName: "JavaScript Fundamentals",
  questions: [
    {
      id: 1,
      text: "Which of the following methods is used to add an element to the end of an array in JavaScript?",
      options: [
        { id: "a", label: "A", text: "array.push()" },
        { id: "b", label: "B", text: "array.pop()" },
        { id: "c", label: "C", text: "array.shift()" },
      ],
    },
    {
      id: 2,
      text: "What is the output of typeof null in JavaScript?",
      options: [
        { id: "a", label: "A", text: '"null"' },
        { id: "b", label: "B", text: '"object"' },
        { id: "c", label: "C", text: '"undefined"' },
      ],
    },
    {
      id: 3,
      text: "Which keyword is used to declare a constant variable in JavaScript?",
      options: [
        { id: "a", label: "A", text: "var" },
        { id: "b", label: "B", text: "let" },
        { id: "c", label: "C", text: "const" },
      ],
    },
    {
      id: 4,
      text: "What does the === operator do in JavaScript?",
      options: [
        { id: "a", label: "A", text: "Compares values only" },
        { id: "b", label: "B", text: "Compares values and types" },
        { id: "c", label: "C", text: "Assigns a value" },
      ],
    },
    {
      id: 5,
      text: "Which method is used to convert a JSON string to a JavaScript object?",
      options: [
        { id: "a", label: "A", text: "JSON.stringify()" },
        { id: "b", label: "B", text: "JSON.parse()" },
        { id: "c", label: "C", text: "JSON.convert()" },
      ],
    },
  ],
}

export function QuizInterface() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Set<number>>(
    new Set()
  )
  const [timeRemaining, setTimeRemaining] = useState(30 * 60) // 30 minutes in seconds
  const [answers, setAnswers] = useState<Record<number, string>>({})

  const currentQuestion = quizData.questions[currentQuestionIndex]
  const totalQuestions = quizData.questions.length
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Load saved answer when question changes
  useEffect(() => {
    const savedAnswer = answers[currentQuestion.id]
    setSelectedAnswer(savedAnswer || null)
  }, [currentQuestionIndex, answers, currentQuestion.id])

  const handleSelectAnswer = (answerId: string) => {
    setSelectedAnswer(answerId)
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answerId,
    }))
  }

  const handleToggleBookmark = () => {
    setBookmarkedQuestions((prev) => {
      const next = new Set(prev)
      if (next.has(currentQuestion.id)) {
        next.delete(currentQuestion.id)
      } else {
        next.add(currentQuestion.id)
      }
      return next
    })
  }

  const handleNext = () => {
    if (isLastQuestion) {
      // Handle quiz completion
      alert("Quiz completed! Your answers have been recorded.")
    } else {
      setCurrentQuestionIndex((prev) => prev + 1)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <QuizHeader
        examName={quizData.examName}
        currentQuestion={currentQuestionIndex + 1}
        totalQuestions={totalQuestions}
        timeRemaining={formatTime(timeRemaining)}
      />

      <main className="container mx-auto max-w-3xl px-4 py-8 md:py-12">
        <div className="flex flex-col gap-8">
          {/* Question Card */}
          <QuestionCard
            questionNumber={currentQuestionIndex + 1}
            questionText={currentQuestion.text}
            isBookmarked={bookmarkedQuestions.has(currentQuestion.id)}
            onToggleBookmark={handleToggleBookmark}
          />

          {/* Answer Options */}
          <AnswerOptions
            options={currentQuestion.options}
            selectedAnswer={selectedAnswer}
            onSelectAnswer={handleSelectAnswer}
          />

          {/* Navigation */}
          <QuizNavigation
            onNext={handleNext}
            isLastQuestion={isLastQuestion}
            hasSelectedAnswer={selectedAnswer !== null}
          />
        </div>
      </main>
    </div>
  )
}
