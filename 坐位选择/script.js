let studentList = [];
let currentStudentIndex = 0;
let selectionHistory = [];

// 加载名单文件
function loadNames() {
    const fileInput = document.getElementById('nameList');
    const file = fileInput.files[0];
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            // 将文本按行分割成数组，并过滤掉空行
            studentList = e.target.result.split('\n')
                .map(name => name.trim())
                .filter(name => name.length > 0);
            
            currentStudentIndex = 0;
            selectionHistory = [];
            updateCurrentStudent();
            
            // 重置所有座位
            document.querySelectorAll('.seat').forEach(seat => {
                seat.textContent = '';
                seat.classList.remove('occupied');
            });
            
            // 添加点击事件
            addSeatClickListeners();
            
            // 更新快速选择列表
            updateStudentList();
        };
        reader.readAsText(file);
    } else {
        alert('请先选择名单文件');
    }
}

// 更新当前选择的学生显示
function updateCurrentStudent() {
    const currentStudentSpan = document.getElementById('currentStudent');
    if (currentStudentIndex < studentList.length) {
        currentStudentSpan.textContent = studentList[currentStudentIndex];
    } else {
        currentStudentSpan.textContent = '所有同学已选择完毕';
    }
}

// 搜索学生
function searchStudent() {
    const searchInput = document.getElementById('studentSearch');
    const searchText = searchInput.value.trim().toLowerCase();
    const studentListDiv = document.getElementById('studentList');
    
    if (searchText === '') {
        studentListDiv.classList.remove('show');
        return;
    }
    
    // 过滤未选座的学生
    const availableStudents = studentList.filter((_, index) => index >= currentStudentIndex);
    const matchedStudents = availableStudents.filter(student => 
        student.toLowerCase().includes(searchText)
    );
    
    // 显示匹配的学生
    studentListDiv.innerHTML = '';
    matchedStudents.forEach(student => {
        const div = document.createElement('div');
        div.className = 'student-item';
        div.textContent = student;
        div.onclick = () => selectStudent(studentList.indexOf(student));
        studentListDiv.appendChild(div);
    });
    
    studentListDiv.classList.add('show');
}

// 选择特定学生
function selectStudent(index) {
    if (index < currentStudentIndex) {
        alert('该学生已选择座位');
        return;
    }
    
    // 如果选择的不是当前学生，需要调整顺序
    if (index !== currentStudentIndex) {
        const student = studentList[index];
        studentList.splice(index, 1);
        studentList.splice(currentStudentIndex, 0, student);
    }
    
    // 清除搜索框和列表
    document.getElementById('studentSearch').value = '';
    document.getElementById('studentList').classList.remove('show');
    
    // 更新显示
    updateCurrentStudent();
}

// 更新学生列表
function updateStudentList() {
    const studentListDiv = document.getElementById('studentList');
    studentListDiv.innerHTML = '';
    
    // 只显示未选座的学生
    const availableStudents = studentList.slice(currentStudentIndex);
    availableStudents.forEach(student => {
        const div = document.createElement('div');
        div.className = 'student-item';
        div.textContent = student;
        div.onclick = () => selectStudent(studentList.indexOf(student));
        studentListDiv.appendChild(div);
    });
}

// 添加座位点击事件
function addSeatClickListeners() {
    document.querySelectorAll('.seat').forEach(seat => {
        seat.onclick = function() {
            if (currentStudentIndex >= studentList.length) {
                alert('所有同学已选择完毕');
                return;
            }
            
            if (this.classList.contains('occupied')) {
                alert('该座位已被选择');
                return;
            }
            
            // 记录选择历史
            selectionHistory.push({
                seatElement: this,
                studentName: studentList[currentStudentIndex],
                seatNumber: this.dataset.seat
            });
            
            // 分配座位
            this.textContent = studentList[currentStudentIndex];
            this.classList.add('occupied');
            
            // 移动到下一个学生
            currentStudentIndex++;
            updateCurrentStudent();
            
            // 更新快速选择列表
            updateStudentList();
        };
    });
}

// 撤销上一步选择
function undoLastSelection() {
    if (selectionHistory.length === 0) {
        alert('没有可撤销的操作');
        return;
    }
    
    const lastSelection = selectionHistory.pop();
    const seat = lastSelection.seatElement;
    
    // 清除座位信息
    seat.textContent = '';
    seat.classList.remove('occupied');
    
    // 返回到上一个学生
    currentStudentIndex--;
    updateCurrentStudent();
    
    // 更新快速选择列表
    updateStudentList();
}

// 导出座位表为图片
function exportSeatingChart() {
    const classroom = document.getElementById('classroom');
    
    html2canvas(classroom, {
        backgroundColor: '#ffffff',
        scale: 2, // 提高清晰度
    }).then(canvas => {
        // 创建下载链接
        const link = document.createElement('a');
        link.download = '座位表.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }).catch(error => {
        console.error('导出失败:', error);
        alert('导出座位表失败，请稍后重试');
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 添加文件输入提示
    const fileInput = document.getElementById('nameList');
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            const fileName = e.target.files[0].name;
            // 可以添加文件名显示等其他UI反馈
        }
    });
    
    // 点击外部关闭学生列表
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.student-quick-select')) {
            document.getElementById('studentList').classList.remove('show');
        }
    });
}); 