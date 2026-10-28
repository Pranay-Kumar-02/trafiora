"""Global pytest configuration and event loop policy for Windows psycopg compatibility."""
import asyncio
import sys
import pytest

# On Windows, psycopg async requires SelectorEventLoop
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
