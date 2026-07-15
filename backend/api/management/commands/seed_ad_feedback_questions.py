from django.core.management.base import BaseCommand
from api.models import SurveyQuestion


class Command(BaseCommand):
    help = "Seed default ad-feedback survey questions"

    def handle(self, *args, **options):
        questions = [
            {
                "question_text": "How would you rate this advertisement?",
                "question_type": "star_rating",
                "order": 0,
                "is_required": True,
                "section": "rating",
            },
            {
                "question_text": "Would you consider purchasing this product?",
                "question_type": "multiple_choice",
                "options": ["Definitely", "Maybe", "Not interested"],
                "order": 1,
                "is_required": True,
                "section": "intent",
            },
            {
                "question_text": "How did this ad make you feel?",
                "question_type": "multiple_choice",
                "options": ["Interested", "Excited", "Neutral", "Annoyed", "Confused"],
                "order": 2,
                "is_required": False,
                "section": "emotion",
            },
            {
                "question_text": "Was the message of this ad clear?",
                "question_type": "multiple_choice",
                "options": ["Very clear", "Somewhat clear", "Not really"],
                "order": 3,
                "is_required": False,
                "section": "clarity",
            },
            {
                "question_text": "Would you recommend this ad to others?",
                "question_type": "multiple_choice",
                "options": ["Yes", "Maybe", "No"],
                "order": 4,
                "is_required": False,
                "section": "recommendation",
            },
            {
                "question_text": "What did you think of this ad?",
                "question_type": "text",
                "order": 5,
                "is_required": False,
                "section": "general",
            },
        ]

        created = 0
        for q_data in questions:
            _, was_created = SurveyQuestion.objects.get_or_create(
                question_text=q_data["question_text"],
                defaults=q_data,
            )
            if was_created:
                created += 1

        self.stdout.write(self.style.SUCCESS(f"Seeded {created} new ad-feedback questions"))
