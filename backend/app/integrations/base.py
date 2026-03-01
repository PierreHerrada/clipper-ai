import os
from abc import ABC, abstractmethod


class BaseIntegration(ABC):
    name: str
    description: str
    required_env_vars: list[str]

    @abstractmethod
    async def health_check(self) -> bool: ...

    def check_env_vars(self) -> list[str]:
        """Return list of missing environment variables."""
        return [var for var in self.required_env_vars if not os.environ.get(var)]

    @property
    def is_configured(self) -> bool:
        """True if all required env vars are set."""
        return len(self.check_env_vars()) == 0
