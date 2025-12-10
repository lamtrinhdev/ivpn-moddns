import httpx
from dns import resolver, message
from dns.query import https as query_https
from dns.message import Message

class DNSLib:
    def __init__(self, server: str):
        self.server = server
        self.my_resolver = resolver.Resolver(configure=False)
        self.my_resolver.nameservers = [self.server]

    async def send_doh_request(self, profile_id: str, domain: str, record_type: str) -> Message:
        with httpx.Client() as client:
            query = message.make_query(domain, record_type)
            r = query_https(
                query, 
                f"{self.server}{profile_id}",
                session=client, 
                resolver=self.my_resolver,
            )
            return r
