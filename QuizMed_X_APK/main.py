# -*- coding: utf-8 -*-
"""Minimal Kivy launcher for environments that build the Python variant."""
try:
    from kivy.app import App
    from kivy.uix.boxlayout import BoxLayout
    from kivy.uix.textinput import TextInput
    from kivy.uix.button import Button
    from kivy.uix.label import Label
except Exception as exc:  # Allows importing core modules without Kivy installed.
    raise SystemExit(f"Kivy is required to run this launcher: {exc}")

from core.question_generator import generate_questions

class QuizMedX(App):
    def build(self):
        root = BoxLayout(orientation="vertical", padding=12, spacing=8)
        root.add_widget(Label(text="QuizMed X — Offline Rule-Based", size_hint_y=None, height=40))
        self.input = TextInput(text="Anatomy is the study of body structure. التشريح يدرس تركيب الجسم.", multiline=True)
        self.output = TextInput(readonly=True, multiline=True)
        btn = Button(text="Generate Questions", size_hint_y=None, height=48)
        btn.bind(on_press=self.generate)
        root.add_widget(self.input); root.add_widget(btn); root.add_widget(self.output)
        return root
    def generate(self, *_):
        qs = generate_questions(self.input.text)
        self.output.text = "\n\n".join(f"{i+1}. {q['stem']}\nAnswer: {q['answer']}" for i, q in enumerate(qs))

if __name__ == "__main__":
    QuizMedX().run()
