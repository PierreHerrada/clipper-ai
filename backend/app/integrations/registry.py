import logging
from typing import ClassVar

from app.integrations.base import BaseIntegration

logger = logging.getLogger(__name__)


class IntegrationRegistry:
    _integrations: ClassVar[list[BaseIntegration]] = []
    _active: ClassVar[list[BaseIntegration]] = []

    @classmethod
    def register(cls, integration_class: type[BaseIntegration]) -> None:
        instance = integration_class()
        cls._integrations.append(instance)

    @classmethod
    def initialize(cls) -> None:
        cls._active = []
        for integration in cls._integrations:
            missing = integration.check_env_vars()
            if missing:
                logger.info(
                    "Integration '%s' inactive — missing env vars: %s",
                    integration.name,
                    ", ".join(missing),
                )
            else:
                cls._active.append(integration)
                logger.info("Integration '%s' active", integration.name)

    @classmethod
    def get_all(cls) -> list[BaseIntegration]:
        return cls._integrations

    @classmethod
    def get_active(cls) -> list[BaseIntegration]:
        return cls._active

    @classmethod
    def get(cls, name: str) -> BaseIntegration | None:
        for integration in cls._active:
            if integration.name == name:
                return integration
        return None

    @classmethod
    def get_status(cls) -> list[dict]:
        result = []
        for integration in cls._integrations:
            missing = integration.check_env_vars()
            result.append(
                {
                    "name": integration.name,
                    "description": integration.description,
                    "active": len(missing) == 0,
                    "missing_env_vars": missing,
                }
            )
        return result

    @classmethod
    def reset(cls) -> None:
        """Reset registry — used in tests."""
        cls._integrations = []
        cls._active = []
