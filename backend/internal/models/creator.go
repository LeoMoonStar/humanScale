package models

import (
	"time"
)

type Creator struct {
	ID             string     `json:"id"`
	UserID         string     `json:"userId"`
	Name           string     `json:"name"`
	Title          *string    `json:"title,omitempty"`
	Bio            *string    `json:"bio,omitempty"`
	Location       *string    `json:"location,omitempty"`
	Category       *string    `json:"category,omitempty"`
	Industry       *string    `json:"industry,omitempty"`
	Company        *string    `json:"company,omitempty"`
	Verified       bool       `json:"verified"`
	AvatarURL      *string    `json:"avatarUrl,omitempty"`
	CoverImageURL  *string    `json:"coverImageUrl,omitempty"`
	Website        *string    `json:"website,omitempty"`
	Twitter        *string    `json:"twitter,omitempty"`
	LinkedIn       *string    `json:"linkedin,omitempty"`
	GitHub         *string    `json:"github,omitempty"`
	Status         string     `json:"status"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
}

type CreatorSkill struct {
	ID         string    `json:"id"`
	CreatorID  string    `json:"creatorId"`
	SkillName  string    `json:"skillName"`
	Proficiency *string  `json:"proficiency,omitempty"`
	CreatedAt  time.Time `json:"createdAt"`
}

type CreatorAchievement struct {
	ID          string    `json:"id"`
	CreatorID   string    `json:"creatorId"`
	Title       string    `json:"title"`
	Description *string   `json:"description,omitempty"`
	AwardedBy   *string   `json:"awardedBy,omitempty"`
	AwardedAt   *time.Time `json:"awardedAt,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
}

type WorkExperience struct {
	ID          string     `json:"id"`
	CreatorID   string     `json:"creatorId"`
	Company     string     `json:"company"`
	Position    string     `json:"position"`
	Description *string    `json:"description,omitempty"`
	StartDate   time.Time  `json:"startDate"`
	EndDate     *time.Time `json:"endDate,omitempty"`
	IsCurrent   bool       `json:"isCurrent"`
	CreatedAt   time.Time  `json:"createdAt"`
}

type Education struct {
	ID          string     `json:"id"`
	CreatorID   string     `json:"creatorId"`
	Institution string     `json:"institution"`
	Degree      string     `json:"degree"`
	FieldOfStudy *string   `json:"fieldOfStudy,omitempty"`
	StartDate   time.Time  `json:"startDate"`
	EndDate     *time.Time `json:"endDate,omitempty"`
	CreatedAt   time.Time  `json:"createdAt"`
}
