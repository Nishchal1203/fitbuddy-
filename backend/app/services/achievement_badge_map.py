from app.models.progress import UserAchievement
from app.schemas.progress import AchievementBadgeCard, BadgeCategory, BadgeIconKey, BadgeRarity


_DEFAULT: tuple[BadgeCategory, BadgeIconKey, BadgeRarity] = ("Milestones", "trophy", "common")

# Maps badge_type (from DB or app logic) to UI metadata for the Progress page.
_META: dict[str, tuple[BadgeCategory, BadgeIconKey, BadgeRarity]] = {
    "FIRST_WORKOUT": ("Fitness", "dumbbell", "common"),
    "STREAK_7": ("Streak", "flame", "rare"),
    "STREAK_30": ("Streak", "flame", "epic"),
    "100_WORKOUTS": ("Milestones", "medal", "legendary"),
    "GOAL_COMPLETE": ("Fitness", "target", "rare"),
    "7_DAY_STREAK": ("Streak", "flame", "rare"),
    "NUTRITION_WEEK": ("Nutrition", "heart", "rare"),
    "HYDRATION": ("Nutrition", "droplets", "common"),
    "SLEEP_GOAL": ("Sleep", "moon", "rare"),
}


def achievement_to_badge_card(row: UserAchievement) -> AchievementBadgeCard:
    key = row.badge_type.strip().upper()
    category, icon_key, rarity = _META.get(key, _DEFAULT)
    unlocked_at = row.unlocked_at.isoformat() if row.unlocked_at else None
    return AchievementBadgeCard(
        id=key or str(row.id),
        title=row.title,
        description=row.description,
        category=category,
        unlocked=True,
        unlocked_at=unlocked_at,
        icon_key=icon_key,
        rarity=rarity,
    )
