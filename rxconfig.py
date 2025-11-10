import reflex as rx

config = rx.Config(
    app_name="lancache_prefill_ui",
    plugins=[
        rx.plugins.SitemapPlugin(),
        rx.plugins.TailwindV4Plugin(),
    ]
)