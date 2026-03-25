import subprocess
import tempfile
import shutil
from pathlib import Path
import json

def parse_pdf(file_path: Path, parser: str = "marker") -> tuple[str, dict]:
    """PDF를 마크다운으로 파싱하고 메타데이터를 반환합니다."""
    
    if parser == "marker":
        return _parse_with_marker(file_path)
    else:
        raise ValueError(f"Unknown parser: {parser}")


def _parse_with_marker(file_path: Path) -> tuple[str, dict]:
    """marker 라이브러리로 PDF를 파싱합니다."""
    
    # 임시 출력 디렉토리 생성
    with tempfile.TemporaryDirectory() as tmp_out:
        cmd = [
            "marker_single",      # marker CLI 명령어
            str(file_path),
            "--output_dir", tmp_out,
        ]
        subprocess.run(cmd, check=True, capture_output=True)
        
        # marker가 생성한 .md 파일 찾기
        md_files = list(Path(tmp_out).rglob("*.md"))
        if not md_files:
            return "", {"error": "marker output not found"}
        
        markdown = md_files[0].read_text(encoding="utf-8")
        
        metadata = {
            "source_file": file_path.name,
            "parser": "marker",
            "source_key": file_path.stem,
        }
        
        # marker가 생성한 메타데이터 JSON 있으면 병합
        json_files = list(Path(tmp_out).rglob("*.json"))
        if json_files:
            with open(json_files[0], encoding="utf-8") as f:
                extra = json.load(f)
                if isinstance(extra, dict):
                    metadata.update(extra)
    
    return markdown, metadata
