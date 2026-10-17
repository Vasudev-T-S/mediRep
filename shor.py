import math
import random
from math import gcd


def find_period(a, N):
    """Smallest r > 0 such that a^r = 1 (mod N).
    This is the step a quantum computer does with QFT; here it is brute-forced."""
    r, x = 1, a % N
    while x != 1:
        x = (x * a) % N
        r += 1
    return r


def shor_factor(N):
    """Factor N using the structure of Shor's algorithm."""
    if N % 2 == 0:
        return 2, N // 2
    while True:
        a = random.randrange(2, N)
        g = gcd(a, N)
        if g > 1:                      # lucky guess
            return g, N // g
        r = find_period(a, N)          # quantum part (simulated)
        if r % 2 == 1:
            continue
        x = pow(a, r // 2, N)
        if x == N - 1:
            continue
        for f in (gcd(x - 1, N), gcd(x + 1, N)):
            if 1 < f < N:
                return f, N // f


def message_to_int(msg):
    """Accept a number or text; text is converted to an integer."""
    msg = str(msg)
    if msg.isdigit():
        return int(msg)
    return int.from_bytes(msg.encode(), "big")


def main():
    N = int(input("Enter N: "))
    e = int(input("Enter e: "))
    d_given = input("Enter d (blank if unknown): ").strip()
    msg = input("Enter message (number or text): ")

    m = message_to_int(msg)
    if m >= N:
        raise ValueError("Message must be smaller than N")

    # 1. Shor: factor N
    p, q = shor_factor(N)
    phi = (p - 1) * (q - 1)
    d = pow(e, -1, phi)                # private key recovered from e and phi
    print(f"\nShor factors: p = {p}, q = {q}")
    print(f"phi(N) = {phi}")
    print(f"Computed d = {d}")
    if d_given and int(d_given) != d:
        print(f"Note: the d you gave ({d_given}) differs, but may still be valid "
              f"if it is congruent mod lcm(p-1, q-1)")

    # 2. Encrypt:  c = m^e mod N
    c = pow(m, e, N)
    print(f"\nCiphertext = {c}")

    # 3. Verify by decrypting:  m = c^d mod N
    print(f"Decrypted  = {pow(c, int(d_given) if d_given else d, N)}")


if __name__ == "__main__":
    main()