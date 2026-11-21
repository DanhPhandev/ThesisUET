"""Sanity-check CodeUET's practice seed without needing a running database.

Usage: python scripts/verify_seed_10_practice.py
This does NOT replace a PostgreSQL/Judge0 integration test.
"""
from __future__ import annotations
import json
import re
from pathlib import Path
from collections import deque
from math import gcd
from functools import reduce
from bisect import bisect_left

ROOT = Path(__file__).resolve().parents[1]
SQL = (ROOT / 'backend/src/main/resources/db/seed/seed_10_practice_problems.sql').read_text(encoding='utf-8')
META = json.loads((ROOT / 'scripts/seed_10_practice_manifest.json').read_text(encoding='utf-8'))
CASE = re.compile(r"\(v_problem_id, '((?:''|[^'])*)', '((?:''|[^'])*)', (TRUE|FALSE), 1, (\d+)\)", re.DOTALL)
TUPLES = [(a.replace("''", "'"), b.replace("''", "'"), sample == 'TRUE', int(ix)) for a,b,sample,ix in CASE.findall(SQL)]


def result(slug: str, input_text: str) -> str:
    numbers = list(map(int, input_text.split())) if slug != 'uet-chuoi-doi-xung' and slug != 'uet-ngoac-hop-le' else []
    if slug == 'uet-dem-so-chan':
        n = numbers[0]; a = numbers[1:]
        assert n == len(a) and n > 0
        return f'{sum(x % 2 == 0 for x in a)}\n'
    if slug == 'uet-chuoi-doi-xung':
        s = input_text.rstrip('\n')
        assert s and s.isalpha() and s.islower()
        return 'YES\n' if s == s[::-1] else 'NO\n'
    if slug == 'uet-ucln-cua-n-so':
        n=numbers[0]; a=numbers[1:]
        assert n == len(a) and any(a)
        return f'{reduce(gcd, a)}\n'
    if slug == 'uet-tong-doan-prefix':
        n,q = numbers[:2]; a=numbers[2:2+n]; vals=numbers[2+n:]
        assert len(a)==n and len(vals)==2*q
        queries=list(zip(vals[::2], vals[1::2]))
        assert all(1<=l<=r<=n for l,r in queries)
        return ''.join(f'{sum(a[l-1:r])}\n' for l,r in queries)
    if slug == 'uet-ngoac-hop-le':
        s = input_text.rstrip('\n'); pairs={')':'(',']':'[','}':'{'}; stack=[]
        assert s and set(s) <= set('()[]{}')
        for c in s:
            if c in '([{': stack.append(c)
            elif not stack or stack.pop()!=pairs[c]: return 'NO\n'
        return 'NO\n' if stack else 'YES\n'
    if slug == 'uet-tim-vi-tri-dau-tien':
        n,q=numbers[:2]; a=numbers[2:2+n]; keys=numbers[2+n:]
        assert a==sorted(a) and len(keys)==q
        out=[]
        for x in keys:
            i=bisect_left(a,x)
            out.append(str(i+1 if i<n and a[i]==x else -1))
        return '\n'.join(out)+'\n'
    if slug == 'uet-chon-lich-hop':
        n=numbers[0]; ab=list(zip(numbers[1::2],numbers[2::2]))
        assert len(ab)==n and all(s<e for s,e in ab)
        last=-1; ans=0
        for s,e in sorted(ab, key=lambda x:x[1]):
            if s>=last: ans+=1; last=e
        return f'{ans}\n'
    if slug == 'uet-bfs-duong-di-ngan-nhat':
        n,m,s,t=numbers[:4]; ab=list(zip(numbers[4::2], numbers[5::2]))
        assert len(ab)==m and 1<=s<=n and 1<=t<=n
        graph=[[] for _ in range(n+1)]
        for a,b in ab:
            assert 1<=a<=n and 1<=b<=n and a!=b
            graph[a].append(b);graph[b].append(a)
        d=[-1]*(n+1);d[s]=0; que=deque([s])
        while que:
            u=que.popleft()
            for v in graph[u]:
                if d[v]==-1:d[v]=d[u]+1;que.append(v)
        return f'{d[t]}\n'
    if slug == 'uet-segment-tree-rmq':
        n,q=numbers[:2]; a=numbers[2:2+n]; data=numbers[2+n:]
        assert len(a)==n
        out=[]; i=0
        for _ in range(q):
            op,x,y=data[i:i+3];i+=3
            if op==1:
                assert 1<=x<=n;a[x-1]=y
            else:
                assert op==2 and 1<=x<=y<=n
                out.append(str(min(a[x-1:y])))
        assert i == len(data) and out
        return '\n'.join(out)+'\n'
    if slug == 'uet-balo-01':
        n,W=numbers[:2]; items=list(zip(numbers[2::2], numbers[3::2]))
        assert n==len(items) and 0<=W<=2000 and all(w>0 and v>=0 for w,v in items)
        dp=[0]*(W+1)
        for w,v in items:
            for cap in range(W,w-1,-1):
                dp[cap]=max(dp[cap],dp[cap-w]+v)
        return f'{dp[W]}\n'
    raise ValueError(slug)


def main():
    assert SQL.count('INSERT INTO problems(')==10
    assert len(META)==10
    assert len(TUPLES)==80, len(TUPLES)
    assert SQL.count('ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_problem_id')==10
    assert SQL.count('INSERT INTO problem_tags(')==10
    assert "role IN ('ADMIN', 'SETTER')" in SQL
    assert len(set(m['slug'] for m in META))==10
    assert {k:sum(m['difficulty']==k for m in META) for k in ['EASY','MEDIUM','HARD']} == {'EASY':3,'MEDIUM':5,'HARD':2}
    for i, problem in enumerate(META):
        cases=TUPLES[i*8:(i+1)*8]
        assert [c[3] for c in cases]==list(range(1,9))
        assert sum(sample for _,_,sample,_ in cases)==2
        assert all(sample==(j<2) for j,(_,_,sample,_) in enumerate(cases))
        for index,(inp,expected,_,_) in enumerate(cases,1):
            got=result(problem['slug'],inp)
            assert got==expected, (problem['slug'], index,repr(got), repr(expected))
        print(f"PASS {problem['difficulty']:6} {problem['slug']:35} (8/8 tests)")
    print('PASS: 10 problems, 80 correct test cases, 20 public samples, 60 hidden cases')


if __name__=='__main__':
    main()
