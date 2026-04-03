import logging
import sys
from typing import Optional


class Logger:
    _instance = None
    _loggers = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Logger, cls).__new__(cls)
            cls._instance._configure_root_logger()
        return cls._instance

    def _configure_root_logger(self):
        """Configure the root logger"""
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            handlers=[logging.StreamHandler(sys.stdout)],
        )

    def get_logger(self, name: str) -> logging.Logger:
        """Get or create a logger with the given name"""
        if name not in self._loggers:
            logger = logging.getLogger(name)
            self._loggers[name] = logger
        return self._loggers[name]

    def set_level(self, level: str):
        """Set logging level for all loggers"""
        level_map = {
            "DEBUG": logging.DEBUG,
            "INFO": logging.INFO,
            "WARNING": logging.WARNING,
            "ERROR": logging.ERROR,
            "CRITICAL": logging.CRITICAL,
        }
        log_level = level_map.get(level.upper(), logging.INFO)
        logging.getLogger().setLevel(log_level)
        for logger in self._loggers.values():
            logger.setLevel(log_level)


# Global logger instance
_logger_instance = Logger()


def get_logger(name: str) -> logging.Logger:
    """Convenience function to get a logger"""
    return _logger_instance.get_logger(name)


def set_log_level(level: str):
    """Convenience function to set log level"""
    _logger_instance.set_level(level)
