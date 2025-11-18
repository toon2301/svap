import os

BUFFER_SIZE = 1024 * 1024

def count_lines(path: str) -> int:
    count = 0
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(BUFFER_SIZE), b''):
            count += chunk.count(b'\n')
    if count == 0 and os.path.getsize(path) > 0:
        return 1
    return count

def main() -> None:
    root = os.getcwd()
    results = []
    for dirpath, _, filenames in os.walk(root):
        for name in filenames:
            full_path = os.path.join(dirpath, name)
            try:
                lines = count_lines(full_path)
            except Exception:
                continue
            if lines >= 500:
                rel_path = os.path.relpath(full_path, root)
                results.append((lines, rel_path))
    results.sort(key=lambda item: (-item[0], item[1]))
    output_path = os.path.join(root, "linecount_results.txt")
    with open(output_path, "w", encoding="utf-8") as out:
        for lines, rel_path in results:
            out.write(f"{lines}\t{rel_path}\n")

if __name__ == '__main__':
    main()
