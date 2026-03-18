from pydantic import BaseModel, EmailStr, field_validator


class UserBase(BaseModel):
	email: EmailStr
	full_name: str | None = None
	experience_level: str | None = None

	model_config = {
		"from_attributes": True,
	}
# by uysing the above line model_config the fast api converting the db to pydantic model automatically 

class UserCreate(UserBase):
	password: str
	
	@field_validator('password')
	@classmethod
	def validate_password(cls, v: str) -> str:
		if len(v.encode('utf-8')) > 72:
			raise ValueError('Password cannot be longer than 72 bytes (approximately 72 characters)')
		if len(v) < 8:
			raise ValueError('Password must be at least 8 characters long')
		return v


class UserRead(UserBase):
	id: int


class UserUpdate(BaseModel):
	full_name: str | None = None
	experience_level: str | None = None

	model_config = {
		"from_attributes": True,
	}

