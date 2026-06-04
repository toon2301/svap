from __future__ import annotations

try:
    from celery import shared_task
except ModuleNotFoundError:

    def shared_task(*decorator_args, **decorator_kwargs):
        def decorator(func):
            class FallbackTask:
                def delay(self, *args, **kwargs):
                    return None

                def run(self, *args, **kwargs):
                    return func(self, *args, **kwargs)

            return FallbackTask()

        return decorator


from portfolio.image_processing import process_portfolio_image_record


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 5},
)
def process_portfolio_image(self, portfolio_image_id: int) -> None:
    process_portfolio_image_record(portfolio_image_id)
