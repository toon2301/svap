from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

try:
    from celery import shared_task
except ModuleNotFoundError:

    def shared_task(*decorator_args, **decorator_kwargs):
        def decorator(func):
            class FallbackTask:
                def delay(self, *args, **kwargs):
                    try:
                        return self.run(*args, **kwargs)
                    except Exception as exc:
                        logger.exception(
                            "Portfolio image fallback task execution failed",
                            extra={"error": str(exc)},
                        )
                        raise

                def run(self, *args, **kwargs):
                    return func(self, *args, **kwargs)

            return FallbackTask()

        return decorator


from portfolio.image_processing import (  # noqa: E402
    mark_processing_failed,
    process_portfolio_image_record,
)

_MAX_RETRIES = 5


def _is_final_attempt(task) -> bool:
    """True na poslednom pokuse (initial beh + _MAX_RETRIES retries).

    Cez getattr, aby fallback shim bez celery (bez .request) len re-raisol
    pôvodnú výnimku namiesto AttributeError.
    """
    retries = getattr(getattr(task, "request", None), "retries", None)
    return isinstance(retries, int) and retries >= _MAX_RETRIES


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": _MAX_RETRIES},
    # Timeout bráni tomu, aby zaseknuté spracovanie (obrovský obrázok, pomalé S3,
    # visiaci moderation call) držalo workera donekonečna – rovnaký princíp ako
    # purge_old_notifications. soft_time_limit vyhodí SoftTimeLimitExceeded (spadá
    # pod autoretry → retry s backoffom), hard time_limit workera dorazí.
    soft_time_limit=120,
    time_limit=150,
)
def process_portfolio_image(self, portfolio_image_id: int) -> None:
    try:
        process_portfolio_image_record(portfolio_image_id)
    except Exception:
        # Po vyčerpaní retries by obrázok ostal navždy PENDING (blokuje slot
        # v limite fotiek) a staging súbor v uploads/ ako orphan – na poslednom
        # pokuse ho označ REJECTED a uprac staging (rovnaký výsledok ako pri
        # zlyhaní enqueue v upload-complete).
        if _is_final_attempt(self):
            mark_processing_failed(portfolio_image_id)
        raise
