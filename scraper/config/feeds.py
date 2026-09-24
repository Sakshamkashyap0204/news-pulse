from dataclasses import dataclass


@dataclass(frozen=True)
class FeedSource:
    identifier: str
    name: str
    url: str


FEED_SOURCES = (
    FeedSource("bbc", "BBC News", "https://feeds.bbci.co.uk/news/rss.xml"),
    FeedSource("npr", "NPR", "https://feeds.npr.org/1001/rss.xml"),
    FeedSource("guardian", "The Guardian", "https://www.theguardian.com/world/rss"),
)
